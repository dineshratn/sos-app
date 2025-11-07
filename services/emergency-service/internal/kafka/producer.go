package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"github.com/sos-app/emergency-service/internal/models"
)

// Producer handles publishing events to Kafka
type Producer struct {
	producer                  *kafka.Producer
	emergencyCreatedTopic     string
	emergencyResolvedTopic    string
	emergencyCancelledTopic   string
}

// ProducerConfig holds configuration for Kafka producer
type ProducerConfig struct {
	Brokers                     []string
	EmergencyCreatedTopic       string
	EmergencyResolvedTopic      string
	EmergencyCancelledTopic     string
}

// NewProducer creates a new Kafka producer
func NewProducer(config ProducerConfig) (*Producer, error) {
	kafkaConfig := &kafka.ConfigMap{
		"bootstrap.servers": config.Brokers[0],
		"client.id":         "emergency-service-producer",
		"acks":              "all",
		"compression.type":  "snappy",
		"retries":           3,
		"retry.backoff.ms":  100,
	}

	producer, err := kafka.NewProducer(kafkaConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create Kafka producer: %w", err)
	}

	p := &Producer{
		producer:                producer,
		emergencyCreatedTopic:   config.EmergencyCreatedTopic,
		emergencyResolvedTopic:  config.EmergencyResolvedTopic,
		emergencyCancelledTopic: config.EmergencyCancelledTopic,
	}

	// Start delivery report handler
	go p.handleDeliveryReports()

	log.Info().
		Str("brokers", config.Brokers[0]).
		Msg("Kafka producer initialized")

	return p, nil
}

// PublishEmergencyCreated publishes an emergency created event
func (p *Producer) PublishEmergencyCreated(ctx context.Context, emergency *models.Emergency) error {
	event := EmergencyCreatedEvent{
		EmergencyID:    emergency.ID,
		UserID:         emergency.UserID,
		Type:           emergency.EmergencyType,
		Location:       emergency.InitialLocation,
		InitialMessage: emergency.InitialMessage,
		AutoTriggered:  emergency.AutoTriggered,
		TriggeredBy:    emergency.TriggeredBy,
		ContactIDs:     []uuid.UUID{}, // Will be populated by notification service
		Timestamp:      time.Now(),
	}

	return p.publish(p.emergencyCreatedTopic, emergency.ID.String(), event)
}

// PublishEmergencyResolved publishes an emergency resolved event
func (p *Producer) PublishEmergencyResolved(ctx context.Context, emergency *models.Emergency) error {
	if emergency.ResolvedAt == nil || emergency.ActivatedAt == nil {
		return fmt.Errorf("emergency must have both activated_at and resolved_at timestamps")
	}

	duration := emergency.ResolvedAt.Sub(*emergency.ActivatedAt)

	event := EmergencyResolvedEvent{
		EmergencyID:     emergency.ID,
		UserID:          emergency.UserID,
		Duration:        int64(duration.Seconds()),
		ResolutionNotes: emergency.ResolutionNotes,
		Timestamp:       time.Now(),
	}

	return p.publish(p.emergencyResolvedTopic, emergency.ID.String(), event)
}

// PublishEmergencyCancelled publishes an emergency cancelled event
func (p *Producer) PublishEmergencyCancelled(ctx context.Context, emergency *models.Emergency, reason string) error {
	event := EmergencyCancelledEvent{
		EmergencyID: emergency.ID,
		UserID:      emergency.UserID,
		Reason:      reason,
		Timestamp:   time.Now(),
	}

	return p.publish(p.emergencyCancelledTopic, emergency.ID.String(), event)
}

// publish is a generic method to publish any event to a topic
func (p *Producer) publish(topic, key string, event interface{}) error {
	// Serialize event to JSON
	value, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	// Create Kafka message
	message := &kafka.Message{
		TopicPartition: kafka.TopicPartition{
			Topic:     &topic,
			Partition: kafka.PartitionAny,
		},
		Key:   []byte(key),
		Value: value,
		Headers: []kafka.Header{
			{Key: "event_type", Value: []byte(fmt.Sprintf("%T", event))},
			{Key: "timestamp", Value: []byte(time.Now().Format(time.RFC3339))},
		},
	}

	// Produce message
	deliveryChan := make(chan kafka.Event, 1)
	err = p.producer.Produce(message, deliveryChan)
	if err != nil {
		return fmt.Errorf("failed to produce message: %w", err)
	}

	// Wait for delivery report
	e := <-deliveryChan
	m := e.(*kafka.Message)

	if m.TopicPartition.Error != nil {
		log.Error().
			Err(m.TopicPartition.Error).
			Str("topic", topic).
			Str("key", key).
			Msg("Failed to deliver message to Kafka")
		return fmt.Errorf("failed to deliver message: %w", m.TopicPartition.Error)
	}

	log.Debug().
		Str("topic", topic).
		Str("key", key).
		Int32("partition", m.TopicPartition.Partition).
		Int64("offset", int64(m.TopicPartition.Offset)).
		Msg("Message delivered to Kafka")

	return nil
}

// handleDeliveryReports listens for delivery reports from Kafka
func (p *Producer) handleDeliveryReports() {
	for e := range p.producer.Events() {
		switch ev := e.(type) {
		case *kafka.Message:
			if ev.TopicPartition.Error != nil {
				log.Error().
					Err(ev.TopicPartition.Error).
					Str("topic", *ev.TopicPartition.Topic).
					Msg("Delivery failed")
			}
		case kafka.Error:
			log.Error().
				Err(ev).
				Msg("Kafka error")
		}
	}
}

// Close gracefully shuts down the producer
func (p *Producer) Close() {
	log.Info().Msg("Closing Kafka producer...")

	// Flush any remaining messages (wait up to 10 seconds)
	remaining := p.producer.Flush(10 * 1000)
	if remaining > 0 {
		log.Warn().
			Int("remaining", remaining).
			Msg("Not all messages were flushed before closing")
	}

	p.producer.Close()
	log.Info().Msg("Kafka producer closed")
}
