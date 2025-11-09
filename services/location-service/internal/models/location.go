package models

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// LocationProvider represents the source of location data
type LocationProvider string

const (
	ProviderGPS      LocationProvider = "GPS"
	ProviderCellular LocationProvider = "CELLULAR"
	ProviderWiFi     LocationProvider = "WIFI"
	ProviderHybrid   LocationProvider = "HYBRID"
)

// LocationPoint represents a single location data point in the time-series
type LocationPoint struct {
	ID           int64            `json:"id" db:"id"`
	EmergencyID  uuid.UUID        `json:"emergencyId" db:"emergency_id"`
	UserID       uuid.UUID        `json:"userId" db:"user_id"`
	Latitude     float64          `json:"latitude" db:"latitude"`
	Longitude    float64          `json:"longitude" db:"longitude"`
	Accuracy     *float64         `json:"accuracy,omitempty" db:"accuracy"`
	Altitude     *float64         `json:"altitude,omitempty" db:"altitude"`
	Speed        *float64         `json:"speed,omitempty" db:"speed"`
	Heading      *float64         `json:"heading,omitempty" db:"heading"`
	Provider     LocationProvider `json:"provider" db:"provider"`
	Address      *string          `json:"address,omitempty" db:"address"`
	Timestamp    time.Time        `json:"timestamp" db:"timestamp"`
	BatteryLevel *int             `json:"batteryLevel,omitempty" db:"battery_level"`
}

// LocationUpdate represents an incoming location update request
type LocationUpdate struct {
	EmergencyID  uuid.UUID        `json:"emergencyId" validate:"required"`
	UserID       uuid.UUID        `json:"userId" validate:"required"`
	Latitude     float64          `json:"latitude" validate:"required,min=-90,max=90"`
	Longitude    float64          `json:"longitude" validate:"required,min=-180,max=180"`
	Accuracy     *float64         `json:"accuracy"`
	Altitude     *float64         `json:"altitude"`
	Speed        *float64         `json:"speed"`
	Heading      *float64         `json:"heading"`
	Provider     LocationProvider `json:"provider" validate:"required"`
	BatteryLevel *int             `json:"batteryLevel"`
}

// BatchLocationUpdate represents multiple location updates for offline sync
type BatchLocationUpdate struct {
	EmergencyID uuid.UUID        `json:"emergencyId" validate:"required"`
	UserID      uuid.UUID        `json:"userId" validate:"required"`
	Locations   []LocationUpdate `json:"locations" validate:"required,min=1,max=1000"`
}

// LocationTrailQuery represents query parameters for location trail
type LocationTrailQuery struct {
	EmergencyID uuid.UUID
	Duration    time.Duration // Default: 30 minutes
}

// LocationHistoryQuery represents query parameters for location history
type LocationHistoryQuery struct {
	EmergencyID uuid.UUID
	Limit       int
	Offset      int
}

// LocationResponse represents the API response for location queries
type LocationResponse struct {
	EmergencyID uuid.UUID       `json:"emergencyId"`
	UserID      uuid.UUID       `json:"userId"`
	Location    *LocationPoint  `json:"location,omitempty"`
	Locations   []LocationPoint `json:"locations,omitempty"`
	Total       int             `json:"total,omitempty"`
}

// WebSocketMessage represents a WebSocket message
type WebSocketMessage struct {
	Type        string         `json:"type"`
	EmergencyID uuid.UUID      `json:"emergencyId"`
	Location    *LocationPoint `json:"location,omitempty"`
}

// WebSocketSubscription represents a WebSocket subscription request
type WebSocketSubscription struct {
	Action      string    `json:"action"`
	EmergencyID uuid.UUID `json:"emergencyId"`
}

// Validate validates the LocationUpdate fields
func (lu *LocationUpdate) Validate() error {
	if lu.Latitude < -90 || lu.Latitude > 90 {
		return errors.New("latitude must be between -90 and 90")
	}
	if lu.Longitude < -180 || lu.Longitude > 180 {
		return errors.New("longitude must be between -180 and 180")
	}
	if lu.Provider == "" {
		return errors.New("provider is required")
	}
	if lu.Accuracy != nil && *lu.Accuracy < 0 {
		return errors.New("accuracy must be non-negative")
	}
	if lu.Speed != nil && *lu.Speed < 0 {
		return errors.New("speed must be non-negative")
	}
	if lu.Heading != nil && (*lu.Heading < 0 || *lu.Heading > 360) {
		return errors.New("heading must be between 0 and 360")
	}
	if lu.BatteryLevel != nil && (*lu.BatteryLevel < 0 || *lu.BatteryLevel > 100) {
		return errors.New("battery level must be between 0 and 100")
	}
	return nil
}

// ToLocationPoint converts LocationUpdate to LocationPoint
func (lu *LocationUpdate) ToLocationPoint() *LocationPoint {
	return &LocationPoint{
		EmergencyID:  lu.EmergencyID,
		UserID:       lu.UserID,
		Latitude:     lu.Latitude,
		Longitude:    lu.Longitude,
		Accuracy:     lu.Accuracy,
		Altitude:     lu.Altitude,
		Speed:        lu.Speed,
		Heading:      lu.Heading,
		Provider:     lu.Provider,
		Timestamp:    time.Now().UTC(),
		BatteryLevel: lu.BatteryLevel,
	}
}

// ValidateProvider checks if the provider is valid
func ValidateProvider(provider LocationProvider) bool {
	switch provider {
	case ProviderGPS, ProviderCellular, ProviderWiFi, ProviderHybrid:
		return true
	default:
		return false
	}
}

// GetProviderPriority returns the priority of a location provider (higher is better)
func GetProviderPriority(provider LocationProvider) int {
	switch provider {
	case ProviderGPS:
		return 3
	case ProviderWiFi:
		return 2
	case ProviderCellular:
		return 1
	case ProviderHybrid:
		return 4
	default:
		return 0
	}
}
