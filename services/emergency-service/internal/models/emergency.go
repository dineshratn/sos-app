package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
)

// EmergencyType represents the type of emergency
type EmergencyType string

const (
	EmergencyTypeMedical      EmergencyType = "MEDICAL"
	EmergencyTypeFire         EmergencyType = "FIRE"
	EmergencyTypePolice       EmergencyType = "POLICE"
	EmergencyTypeGeneral      EmergencyType = "GENERAL"
	EmergencyTypeFallDetected EmergencyType = "FALL_DETECTED"
	EmergencyTypeDeviceAlert  EmergencyType = "DEVICE_ALERT"
)

// EmergencyStatus represents the current status of an emergency
type EmergencyStatus string

const (
	StatusPending   EmergencyStatus = "PENDING"   // Countdown active
	StatusActive    EmergencyStatus = "ACTIVE"    // Emergency confirmed
	StatusCancelled EmergencyStatus = "CANCELLED" // User cancelled during countdown
	StatusResolved  EmergencyStatus = "RESOLVED"  // Emergency resolved
)

// Location represents a geographic location
type Location struct {
	Latitude  float64  `json:"latitude"`
	Longitude float64  `json:"longitude"`
	Accuracy  *float64 `json:"accuracy,omitempty"`   // meters
	Altitude  *float64 `json:"altitude,omitempty"`   // meters
	Address   *string  `json:"address,omitempty"`    // reverse geocoded address
	Timestamp time.Time `json:"timestamp"`
}

// Value implements driver.Valuer for Location (PostgreSQL JSONB)
func (l Location) Value() (driver.Value, error) {
	return json.Marshal(l)
}

// Scan implements sql.Scanner for Location (PostgreSQL JSONB)
func (l *Location) Scan(value interface{}) error {
	if value == nil {
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("failed to scan Location: invalid type")
	}

	return json.Unmarshal(bytes, l)
}

// Emergency represents an emergency alert
type Emergency struct {
	ID               uuid.UUID       `json:"id" db:"id"`
	UserID           uuid.UUID       `json:"user_id" db:"user_id"`
	EmergencyType    EmergencyType   `json:"emergency_type" db:"emergency_type"`
	Status           EmergencyStatus `json:"status" db:"status"`
	InitialLocation  Location        `json:"initial_location" db:"initial_location"`
	InitialMessage   *string         `json:"initial_message,omitempty" db:"initial_message"`
	AutoTriggered    bool            `json:"auto_triggered" db:"auto_triggered"`
	TriggeredBy      string          `json:"triggered_by" db:"triggered_by"` // user, device:dev_123, system
	CountdownSeconds int             `json:"countdown_seconds" db:"countdown_seconds"`
	CreatedAt        time.Time       `json:"created_at" db:"created_at"`
	ActivatedAt      *time.Time      `json:"activated_at,omitempty" db:"activated_at"`
	CancelledAt      *time.Time      `json:"cancelled_at,omitempty" db:"cancelled_at"`
	ResolvedAt       *time.Time      `json:"resolved_at,omitempty" db:"resolved_at"`
	ResolutionNotes  *string         `json:"resolution_notes,omitempty" db:"resolution_notes"`
	Metadata         *json.RawMessage `json:"metadata,omitempty" db:"metadata"` // Additional context data
}

// CreateEmergencyRequest represents a request to create a new emergency
type CreateEmergencyRequest struct {
	UserID           uuid.UUID     `json:"user_id"`
	EmergencyType    EmergencyType `json:"emergency_type"`
	Location         Location      `json:"location"`
	InitialMessage   *string       `json:"initial_message,omitempty"`
	AutoTriggered    bool          `json:"auto_triggered"`
	TriggeredBy      string        `json:"triggered_by"`
	CountdownSeconds *int          `json:"countdown_seconds,omitempty"` // Optional override
}

// UpdateEmergencyRequest represents a request to update an emergency
type UpdateEmergencyRequest struct {
	Status          *EmergencyStatus `json:"status,omitempty"`
	ResolutionNotes *string          `json:"resolution_notes,omitempty"`
}

// EmergencyResponse represents the API response for an emergency
type EmergencyResponse struct {
	Emergency       Emergency                `json:"emergency"`
	Acknowledgments []EmergencyAcknowledgment `json:"acknowledgments,omitempty"`
}

// EmergencyListResponse represents a paginated list of emergencies
type EmergencyListResponse struct {
	Emergencies []Emergency `json:"emergencies"`
	Total       int         `json:"total"`
	Page        int         `json:"page"`
	PageSize    int         `json:"page_size"`
}

// HistoryFilters represents filters for emergency history queries
type HistoryFilters struct {
	UserID    uuid.UUID
	Status    *EmergencyStatus
	Type      *EmergencyType
	StartDate *time.Time
	EndDate   *time.Time
	Page      int
	PageSize  int
}

// Validate validates the emergency data
func (e *Emergency) Validate() error {
	if e.UserID == uuid.Nil {
		return errors.New("user_id is required")
	}

	if e.EmergencyType == "" {
		return errors.New("emergency_type is required")
	}

	// Validate emergency type
	validTypes := []EmergencyType{
		EmergencyTypeMedical,
		EmergencyTypeFire,
		EmergencyTypePolice,
		EmergencyTypeGeneral,
		EmergencyTypeFallDetected,
		EmergencyTypeDeviceAlert,
	}
	isValidType := false
	for _, t := range validTypes {
		if e.EmergencyType == t {
			isValidType = true
			break
		}
	}
	if !isValidType {
		return errors.New("invalid emergency_type")
	}

	// Validate status
	validStatuses := []EmergencyStatus{StatusPending, StatusActive, StatusCancelled, StatusResolved}
	isValidStatus := false
	for _, s := range validStatuses {
		if e.Status == s {
			isValidStatus = true
			break
		}
	}
	if !isValidStatus {
		return errors.New("invalid status")
	}

	// Validate location
	if e.InitialLocation.Latitude < -90 || e.InitialLocation.Latitude > 90 {
		return errors.New("invalid latitude: must be between -90 and 90")
	}
	if e.InitialLocation.Longitude < -180 || e.InitialLocation.Longitude > 180 {
		return errors.New("invalid longitude: must be between -180 and 180")
	}

	if e.CountdownSeconds < 0 {
		return errors.New("countdown_seconds must be non-negative")
	}

	return nil
}

// IsActive returns true if the emergency is currently active
func (e *Emergency) IsActive() bool {
	return e.Status == StatusActive
}

// IsPending returns true if the emergency is in countdown phase
func (e *Emergency) IsPending() bool {
	return e.Status == StatusPending
}

// CanBeCancelled returns true if the emergency can be cancelled
func (e *Emergency) CanBeCancelled() bool {
	return e.Status == StatusPending || e.Status == StatusActive
}

// CanBeResolved returns true if the emergency can be resolved
func (e *Emergency) CanBeResolved() bool {
	return e.Status == StatusActive
}

// Duration returns the total duration of the emergency
func (e *Emergency) Duration() *time.Duration {
	if e.ActivatedAt == nil {
		return nil
	}

	endTime := time.Now()
	if e.ResolvedAt != nil {
		endTime = *e.ResolvedAt
	}

	duration := endTime.Sub(*e.ActivatedAt)
	return &duration
}
