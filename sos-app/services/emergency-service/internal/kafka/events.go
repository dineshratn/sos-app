package kafka

import (
	"time"

	"github.com/google/uuid"
	"github.com/sos-app/emergency-service/internal/models"
)

// EmergencyCreatedEvent represents an event when an emergency is created/activated
type EmergencyCreatedEvent struct {
	EmergencyID   uuid.UUID           `json:"emergency_id"`
	UserID        uuid.UUID           `json:"user_id"`
	Type          models.EmergencyType `json:"type"`
	Location      models.Location     `json:"location"`
	InitialMessage *string            `json:"initial_message,omitempty"`
	AutoTriggered bool                `json:"auto_triggered"`
	TriggeredBy   string              `json:"triggered_by"`
	ContactIDs    []uuid.UUID         `json:"contact_ids"` // To be populated by user service
	Timestamp     time.Time           `json:"timestamp"`
}

// EmergencyResolvedEvent represents an event when an emergency is resolved
type EmergencyResolvedEvent struct {
	EmergencyID     uuid.UUID `json:"emergency_id"`
	UserID          uuid.UUID `json:"user_id"`
	Duration        int64     `json:"duration_seconds"`
	ResolutionNotes *string   `json:"resolution_notes,omitempty"`
	Timestamp       time.Time `json:"timestamp"`
}

// EmergencyCancelledEvent represents an event when an emergency is cancelled
type EmergencyCancelledEvent struct {
	EmergencyID uuid.UUID `json:"emergency_id"`
	UserID      uuid.UUID `json:"user_id"`
	Reason      string    `json:"reason"`
	Timestamp   time.Time `json:"timestamp"`
}

// LocationUpdatedEvent represents a location update event (consumed, not produced by this service)
type LocationUpdatedEvent struct {
	EmergencyID uuid.UUID       `json:"emergency_id"`
	UserID      uuid.UUID       `json:"user_id"`
	Location    models.Location `json:"location"`
	Timestamp   time.Time       `json:"timestamp"`
}
