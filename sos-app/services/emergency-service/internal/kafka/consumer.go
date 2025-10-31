package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
	"github.com/rs/zerolog/log"
	"github.com/sos-app/emergency-service/internal/models"
	"github.com/sos-app/emergency-service/internal/repository"
)

// Consumer handles consuming events from Kafka
type Consumer struct {
	consumer    *kafka.Consumer
	ackRepo     *repository.AcknowledgmentRepository
	running     bool
	stopChan    chan struct{}
}

// ConsumerConfig holds configuration for Kafka consumer
type ConsumerConfig struct {
	Brokers                    []string
	ConsumerGroup              string
	ContactAcknowledgedTopic   string
	LocationUpdatedTopic       string
}

// NewConsumer creates a new Kafka consumer
func NewConsumer(config ConsumerConfig, ackRepo *repository.AcknowledgmentRepository) (*Consumer, error) {
	kafkaConfig := &kafka.ConfigMap{
		"bootstrap.servers":  config.Brokers[0],
		"group.id":           config.ConsumerGroup,
		"auto.offset.reset":  "earliest",
		"enable.auto.commit": false,
	}

	consumer, err := kafka.NewConsumer(kafkaConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create Kafka consumer: %w", err)
	}

	// Subscribe to topics
	topics := []string{
		config.ContactAcknowledgedTopic,
		config.LocationUpdatedTopic,
	}

	err = consumer.SubscribeTopics(topics, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to subscribe to topics: %w", err)
	}

	c := &Consumer{
		consumer: consumer,
		ackRepo:  ackRepo,
		running:  false,
		stopChan: make(chan struct{}),
	}

	log.Info().
		Str("brokers", config.Brokers[0]).
		Str("group", config.ConsumerGroup).
		Strs("topics", topics).
		Msg("Kafka consumer initialized")

	return c, nil
}

// Start begins consuming messages from Kafka
func (c *Consumer) Start(ctx context.Context) {
	c.running = true

	log.Info().Msg("Starting Kafka consumer...")

	go func() {
		for c.running {
			select {
			case <-c.stopChan:
				return
			case <-ctx.Done():
				c.Stop()
				return
			default:
				msg, err := c.consumer.ReadMessage(100 * time.Millisecond)
				if err != nil {
					if err.(kafka.Error).Code() == kafka.ErrTimedOut {
						continue
					}
					log.Error().Err(err).Msg("Error reading Kafka message")
					continue
				}

				c.handleMessage(ctx, msg)

				// Commit offset after successful processing
				if _, err := c.consumer.CommitMessage(msg); err != nil {
					log.Error().Err(err).Msg("Error committing Kafka offset")
				}
			}
		}
	}()
}

// handleMessage processes a Kafka message based on its topic
func (c *Consumer) handleMessage(ctx context.Context, msg *kafka.Message) {
	topic := *msg.TopicPartition.Topic

	log.Debug().
		Str("topic", topic).
		Str("key", string(msg.Key)).
		Int32("partition", msg.TopicPartition.Partition).
		Int64("offset", int64(msg.TopicPartition.Offset)).
		Msg("Received Kafka message")

	switch topic {
	case "contact-acknowledged":
		c.handleContactAcknowledged(ctx, msg.Value)
	case "location-updated":
		c.handleLocationUpdated(ctx, msg.Value)
	default:
		log.Warn().Str("topic", topic).Msg("Unknown topic received")
	}
}

// handleContactAcknowledged processes contact acknowledgment events
func (c *Consumer) handleContactAcknowledged(ctx context.Context, data []byte) {
	var event models.ContactAcknowledgedEvent
	if err := json.Unmarshal(data, &event); err != nil {
		log.Error().Err(err).Msg("Failed to unmarshal ContactAcknowledgedEvent")
		return
	}

	log.Info().
		Str("emergency_id", event.EmergencyID.String()).
		Str("contact_id", event.ContactID.String()).
		Str("contact_name", event.ContactName).
		Msg("Processing contact acknowledgment")

	// Create acknowledgment record
	ack := &models.EmergencyAcknowledgment{
		EmergencyID:    event.EmergencyID,
		ContactID:      event.ContactID,
		ContactName:    event.ContactName,
		AcknowledgedAt: event.AcknowledgedAt,
		Location:       event.Location,
		Message:        event.Message,
	}

	// Validate acknowledgment
	if err := ack.Validate(); err != nil {
		log.Error().Err(err).Msg("Invalid acknowledgment event")
		return
	}

	// Save to database
	if err := c.ackRepo.Create(ctx, ack); err != nil {
		if err == repository.ErrDuplicateAcknowledgment {
			log.Warn().
				Str("emergency_id", event.EmergencyID.String()).
				Str("contact_id", event.ContactID.String()).
				Msg("Contact already acknowledged this emergency")
			return
		}
		log.Error().Err(err).Msg("Failed to create acknowledgment record")
		return
	}

	log.Info().
		Str("emergency_id", event.EmergencyID.String()).
		Str("contact_id", event.ContactID.String()).
		Msg("Contact acknowledgment recorded successfully")
}

// handleLocationUpdated processes location update events (for future use)
func (c *Consumer) handleLocationUpdated(ctx context.Context, data []byte) {
	var event LocationUpdatedEvent
	if err := json.Unmarshal(data, &event); err != nil {
		log.Error().Err(err).Msg("Failed to unmarshal LocationUpdatedEvent")
		return
	}

	log.Debug().
		Str("emergency_id", event.EmergencyID.String()).
		Str("user_id", event.UserID.String()).
		Float64("lat", event.Location.Latitude).
		Float64("lng", event.Location.Longitude).
		Msg("Received location update")

	// Location updates are primarily handled by the Location Service
	// This service may use them for escalation logic or analytics
	// For now, we just log them
}

// Stop gracefully shuts down the consumer
func (c *Consumer) Stop() {
	if !c.running {
		return
	}

	log.Info().Msg("Stopping Kafka consumer...")
	c.running = false
	close(c.stopChan)

	if err := c.consumer.Close(); err != nil {
		log.Error().Err(err).Msg("Error closing Kafka consumer")
	}

	log.Info().Msg("Kafka consumer stopped")
}
