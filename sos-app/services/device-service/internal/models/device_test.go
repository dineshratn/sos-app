package models

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestDeviceJSON(t *testing.T) {
	// Test JSON marshaling/unmarshaling
	device := &Device{
		ID:           "device-123",
		UserID:       "user-123",
		DeviceType:   DeviceTypeSmartWatch,
		Manufacturer: "Apple",
		Model:        "Watch Series 8",
		MacAddress:   "00:1A:2B:3C:4D:5E",
		PairedAt:     time.Now(),
		BatteryLevel: 85,
		Status:       DeviceStatusActive,
		Capabilities: []string{"heart_rate", "fall_detection"},
		Settings:     map[string]interface{}{"interval": 60},
	}

	// Marshal to JSON
	data, err := json.Marshal(device)
	assert.NoError(t, err)

	// Unmarshal back
	var unmarshaled Device
	err = json.Unmarshal(data, &unmarshaled)
	assert.NoError(t, err)

	// Verify key fields
	assert.Equal(t, device.ID, unmarshaled.ID)
	assert.Equal(t, device.UserID, unmarshaled.UserID)
	assert.Equal(t, device.DeviceType, unmarshaled.DeviceType)
	assert.Equal(t, device.MacAddress, unmarshaled.MacAddress)
	assert.Equal(t, device.BatteryLevel, unmarshaled.BatteryLevel)
}

func TestTelemetryDataJSON(t *testing.T) {
	telemetry := &TelemetryData{
		DeviceID:     "device-123",
		Timestamp:    time.Now(),
		BatteryLevel: 75,
		VitalSigns: &VitalSigns{
			HeartRate:   72,
			SpO2:        98,
			Temperature: 36.8,
		},
		Location: &Location{
			Latitude:  37.7749,
			Longitude: -122.4194,
			Accuracy:  10.5,
		},
	}

	// Marshal to JSON
	data, err := json.Marshal(telemetry)
	assert.NoError(t, err)
	assert.NotEmpty(t, data)

	// Unmarshal back
	var unmarshaled TelemetryData
	err = json.Unmarshal(data, &unmarshaled)
	assert.NoError(t, err)

	assert.Equal(t, telemetry.DeviceID, unmarshaled.DeviceID)
	assert.Equal(t, telemetry.BatteryLevel, unmarshaled.BatteryLevel)
	assert.Equal(t, telemetry.VitalSigns.HeartRate, unmarshaled.VitalSigns.HeartRate)
	assert.Equal(t, telemetry.VitalSigns.SpO2, unmarshaled.VitalSigns.SpO2)
}

func TestDeviceEventJSON(t *testing.T) {
	event := &DeviceEvent{
		DeviceID:   "device-123",
		EventType:  EventTypeFallDetected,
		Timestamp:  time.Now(),
		Confidence: 0.95,
		Data: map[string]interface{}{
			"impact_force": 8.5,
		},
	}

	// Marshal to JSON
	data, err := json.Marshal(event)
	assert.NoError(t, err)
	assert.NotEmpty(t, data)

	// Unmarshal back
	var unmarshaled DeviceEvent
	err = json.Unmarshal(data, &unmarshaled)
	assert.NoError(t, err)

	assert.Equal(t, event.DeviceID, unmarshaled.DeviceID)
	assert.Equal(t, event.EventType, unmarshaled.EventType)
	assert.Equal(t, event.Confidence, unmarshaled.Confidence)
}

func TestDeviceTypes(t *testing.T) {
	assert.Equal(t, DeviceType("SMART_WATCH"), DeviceTypeSmartWatch)
	assert.Equal(t, DeviceType("PANIC_BUTTON"), DeviceTypePanicButton)
	assert.Equal(t, DeviceType("FALL_DETECTOR"), DeviceTypeFallDetector)
	assert.Equal(t, DeviceType("HEALTH_MONITOR"), DeviceTypeHealthMonitor)
}

func TestDeviceStatus(t *testing.T) {
	assert.Equal(t, DeviceStatus("ACTIVE"), DeviceStatusActive)
	assert.Equal(t, DeviceStatus("INACTIVE"), DeviceStatusInactive)
	assert.Equal(t, DeviceStatus("DISCONNECTED"), DeviceStatusDisconnected)
	assert.Equal(t, DeviceStatus("DELETED"), DeviceStatusDeleted)
}

func TestEventTypes(t *testing.T) {
	assert.Equal(t, "FallDetected", EventTypeFallDetected)
	assert.Equal(t, "SOSButtonPressed", EventTypeSOSButtonPressed)
	assert.Equal(t, "GeofenceExit", EventTypeGeofenceExit)
}
