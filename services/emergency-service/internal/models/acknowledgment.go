package models

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// EmergencyAcknowledgment represents a contact's acknowledgment of an emergency
type EmergencyAcknowledgment struct {
	ID           uuid.UUID  `json:"id" db:"id"`
	EmergencyID  uuid.UUID  `json:"emergency_id" db:"emergency_id"`
	ContactID    uuid.UUID  `json:"contact_id" db:"contact_id"`
	ContactName  string     `json:"contact_name" db:"contact_name"`
	ContactPhone *string    `json:"contact_phone,omitempty" db:"contact_phone"`
	ContactEmail *string    `json:"contact_email,omitempty" db:"contact_email"`
	AcknowledgedAt time.Time `json:"acknowledged_at" db:"acknowledged_at"`
	Location     *Location  `json:"location,omitempty" db:"location"` // Contact's location when acknowledging
	Message      *string    `json:"message,omitempty" db:"message"`
}

// CreateAcknowledgmentRequest represents a request to acknowledge an emergency
type CreateAcknowledgmentRequest struct {
	EmergencyID  uuid.UUID `json:"emergency_id"`
	ContactID    uuid.UUID `json:"contact_id"`
	ContactName  string    `json:"contact_name"`
	ContactPhone *string   `json:"contact_phone,omitempty"`
	ContactEmail *string   `json:"contact_email,omitempty"`
	Location     *Location `json:"location,omitempty"`
	Message      *string   `json:"message,omitempty"`
}

// AcknowledgmentResponse represents the API response for an acknowledgment
type AcknowledgmentResponse struct {
	Acknowledgment EmergencyAcknowledgment `json:"acknowledgment"`
	Emergency      Emergency               `json:"emergency"`
}

// Validate validates the acknowledgment data
func (a *EmergencyAcknowledgment) Validate() error {
	if a.EmergencyID == uuid.Nil {
		return errors.New("emergency_id is required")
	}

	if a.ContactID == uuid.Nil {
		return errors.New("contact_id is required")
	}

	if a.ContactName == "" {
		return errors.New("contact_name is required")
	}

	// At least one contact method should be provided
	if a.ContactPhone == nil && a.ContactEmail == nil {
		return errors.New("at least one contact method (phone or email) is required")
	}

	// Validate location if provided
	if a.Location != nil {
		if a.Location.Latitude < -90 || a.Location.Latitude > 90 {
			return errors.New("invalid latitude: must be between -90 and 90")
		}
		if a.Location.Longitude < -180 || a.Location.Longitude > 180 {
			return errors.New("invalid longitude: must be between -180 and 180")
		}
	}

	return nil
}

// ContactAcknowledgedEvent represents a Kafka event for contact acknowledgment
type ContactAcknowledgedEvent struct {
	EmergencyID    uuid.UUID `json:"emergency_id"`
	ContactID      uuid.UUID `json:"contact_id"`
	ContactName    string    `json:"contact_name"`
	AcknowledgedAt time.Time `json:"acknowledged_at"`
	Location       *Location `json:"location,omitempty"`
	Message        *string   `json:"message,omitempty"`
}
