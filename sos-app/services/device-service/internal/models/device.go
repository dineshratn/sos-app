package models

import (
	"time"
)

// DeviceType represents the type of IoT device
type DeviceType string

const (
	DeviceTypeSmartWatch    DeviceType = "SMART_WATCH"
	DeviceTypePanicButton   DeviceType = "PANIC_BUTTON"
	DeviceTypeFallDetector  DeviceType = "FALL_DETECTOR"
	DeviceTypeHealthMonitor DeviceType = "HEALTH_MONITOR"
)

// DeviceStatus represents the current status of a device
type DeviceStatus string

const (
	DeviceStatusActive       DeviceStatus = "ACTIVE"
	DeviceStatusInactive     DeviceStatus = "INACTIVE"
	DeviceStatusDisconnected DeviceStatus = "DISCONNECTED"
	DeviceStatusDeleted      DeviceStatus = "DELETED"
)

// Device represents an IoT device paired with a user
type Device struct {
	ID           string       `json:"id" db:"id"`
	UserID       string       `json:"user_id" db:"user_id"`
	DeviceType   DeviceType   `json:"device_type" db:"device_type"`
	Manufacturer string       `json:"manufacturer" db:"manufacturer"`
	Model        string       `json:"model" db:"model"`
	MacAddress   string       `json:"mac_address" db:"mac_address"`
	PairedAt     time.Time    `json:"paired_at" db:"paired_at"`
	BatteryLevel int          `json:"battery_level" db:"battery_level"`
	Status       DeviceStatus `json:"status" db:"status"`
	Capabilities []string     `json:"capabilities" db:"capabilities"`
	Settings     map[string]interface{} `json:"settings,omitempty" db:"settings"`
	LastSeenAt   *time.Time   `json:"last_seen_at,omitempty" db:"last_seen_at"`
	CreatedAt    time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at" db:"updated_at"`
}

// PairDeviceRequest represents the request to pair a new device
type PairDeviceRequest struct {
	DeviceType   DeviceType `json:"device_type"`
	Manufacturer string     `json:"manufacturer"`
	Model        string     `json:"model"`
	MacAddress   string     `json:"mac_address"`
	Capabilities []string   `json:"capabilities"`
}

// UpdateDeviceSettingsRequest represents the request to update device settings
type UpdateDeviceSettingsRequest struct {
	Settings map[string]interface{} `json:"settings"`
}

// TelemetryData represents telemetry data from devices
type TelemetryData struct {
	DeviceID     string                 `json:"device_id"`
	Timestamp    time.Time              `json:"timestamp"`
	BatteryLevel int                    `json:"battery_level,omitempty"`
	VitalSigns   *VitalSigns            `json:"vital_signs,omitempty"`
	Location     *Location              `json:"location,omitempty"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
}

// VitalSigns represents health vital signs
type VitalSigns struct {
	HeartRate   int     `json:"heart_rate,omitempty"`
	SpO2        int     `json:"spo2,omitempty"`
	Temperature float64 `json:"temperature,omitempty"`
	BloodPressure *BloodPressure `json:"blood_pressure,omitempty"`
}

// BloodPressure represents blood pressure readings
type BloodPressure struct {
	Systolic  int `json:"systolic"`
	Diastolic int `json:"diastolic"`
}

// Location represents GPS coordinates
type Location struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Accuracy  float64 `json:"accuracy,omitempty"`
}

// DeviceEvent represents events from devices
type DeviceEvent struct {
	DeviceID   string                 `json:"device_id"`
	EventType  string                 `json:"event_type"`
	Timestamp  time.Time              `json:"timestamp"`
	Confidence float64                `json:"confidence,omitempty"`
	Data       map[string]interface{} `json:"data,omitempty"`
}

const (
	EventTypeFallDetected     = "FallDetected"
	EventTypeSOSButtonPressed = "SOSButtonPressed"
	EventTypeGeofenceExit     = "GeofenceExit"
)
