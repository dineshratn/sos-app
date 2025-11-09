package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/segmentio/kafka-go"
	"github.com/sos-app/location-service/internal/models"
)

// Producer handles Kafka message production
type Producer struct {
	writer *kafka.Writer
}

// NewProducer creates a new Kafka producer
func NewProducer(brokers []string) (*Producer, error) {
	writer := &kafka.Writer{
		Addr:         kafka.TCP(brokers...),
		Topic:        "location-updated",
		Balancer:     &kafka.Hash{},
		MaxAttempts:  3,
		WriteTimeout: 10 * time.Second,
		ReadTimeout:  10 * time.Second,
		RequiredAcks: kafka.RequireOne,
		Compression:  kafka.Snappy,
	}

	return &Producer{writer: writer}, nil
}

// Close closes the Kafka writer
func (p *Producer) Close() error {
	return p.writer.Close()
}

// PublishLocationUpdate publishes a location update event to Kafka
func (p *Producer) PublishLocationUpdate(ctx context.Context, location *models.LocationPoint) error {
	// Create event payload
	event := map[string]interface{}{
		"eventType":   "LocationUpdated",
		"emergencyId": location.EmergencyID.String(),
		"userId":      location.UserID.String(),
		"location": map[string]interface{}{
			"latitude":     location.Latitude,
			"longitude":    location.Longitude,
			"accuracy":     location.Accuracy,
			"altitude":     location.Altitude,
			"speed":        location.Speed,
			"heading":      location.Heading,
			"provider":     location.Provider,
			"address":      location.Address,
			"timestamp":    location.Timestamp,
			"batteryLevel": location.BatteryLevel,
		},
		"timestamp": time.Now().UTC(),
	}

	// Serialize to JSON
	value, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	// Create Kafka message
	message := kafka.Message{
		Key:   []byte(location.EmergencyID.String()),
		Value: value,
		Time:  time.Now(),
	}

	// Write message to Kafka
	err = p.writer.WriteMessages(ctx, message)
	if err != nil {
		return fmt.Errorf("failed to publish location update: %w", err)
	}

	return nil
}
