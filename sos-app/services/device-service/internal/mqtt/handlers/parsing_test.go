package handlers

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/sos-app/device-service/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestParseTelemetryData(t *testing.T) {
	telemetryJSON := `{
		"device_id": "device-123",
		"timestamp": "2024-01-15T10:30:00Z",
		"battery_level": 85,
		"vital_signs": {
			"heart_rate": 72,
			"spo2": 98,
			"temperature": 36.8
		},
		"location": {
			"latitude": 37.7749,
			"longitude": -122.4194,
			"accuracy": 10.5
		}
	}`

	var telemetry models.TelemetryData
	err := json.Unmarshal([]byte(telemetryJSON), &telemetry)
	assert.NoError(t, err)

	assert.Equal(t, "device-123", telemetry.DeviceID)
	assert.Equal(t, 85, telemetry.BatteryLevel)
	assert.NotNil(t, telemetry.VitalSigns)
	assert.Equal(t, 72, telemetry.VitalSigns.HeartRate)
	assert.Equal(t, 98, telemetry.VitalSigns.SpO2)
	assert.Equal(t, 36.8, telemetry.VitalSigns.Temperature)
	assert.NotNil(t, telemetry.Location)
	assert.Equal(t, 37.7749, telemetry.Location.Latitude)
}

func TestParseFallDetectionEvent(t *testing.T) {
	eventJSON := `{
		"device_id": "device-123",
		"event_type": "FallDetected",
		"timestamp": "2024-01-15T10:30:00Z",
		"confidence": 0.95,
		"data": {
			"impact_force": 8.5,
			"location": {
				"latitude": 37.7749,
				"longitude": -122.4194
			}
		}
	}`

	var event models.DeviceEvent
	err := json.Unmarshal([]byte(eventJSON), &event)
	assert.NoError(t, err)

	assert.Equal(t, "device-123", event.DeviceID)
	assert.Equal(t, models.EventTypeFallDetected, event.EventType)
	assert.Equal(t, 0.95, event.Confidence)
	assert.NotNil(t, event.Data)
}

func TestParseSOSButtonEvent(t *testing.T) {
	eventJSON := `{
		"device_id": "device-456",
		"event_type": "SOSButtonPressed",
		"timestamp": "2024-01-15T10:30:00Z",
		"data": {
			"location": {
				"latitude": 37.7749,
				"longitude": -122.4194
			}
		}
	}`

	var event models.DeviceEvent
	err := json.Unmarshal([]byte(eventJSON), &event)
	assert.NoError(t, err)

	assert.Equal(t, "device-456", event.DeviceID)
	assert.Equal(t, models.EventTypeSOSButtonPressed, event.EventType)
	assert.NotNil(t, event.Data)
}

func TestExtractDeviceIDFromTopic(t *testing.T) {
	tests := []struct {
		name       string
		topic      string
		expectedID string
		shouldFail bool
	}{
		{
			name:       "Valid telemetry topic",
			topic:      "devices/device-123/telemetry",
			expectedID: "device-123",
			shouldFail: false,
		},
		{
			name:       "Valid events topic",
			topic:      "devices/device-456/events",
			expectedID: "device-456",
			shouldFail: false,
		},
		{
			name:       "Invalid topic - too few parts",
			topic:      "devices/telemetry",
			expectedID: "",
			shouldFail: true,
		},
		{
			name:       "Invalid topic - wrong format",
			topic:      "invalid/topic/format/extra",
			expectedID: "",
			shouldFail: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			parts := strings.Split(tt.topic, "/")
			if tt.shouldFail {
				assert.NotEqual(t, 3, len(parts))
			} else {
				assert.Equal(t, 3, len(parts))
				deviceID := parts[1]
				assert.Equal(t, tt.expectedID, deviceID)
			}
		})
	}
}

func TestFallDetectionConfidenceThreshold(t *testing.T) {
	tests := []struct {
		name           string
		confidence     float64
		shouldTrigger  bool
	}{
		{
			name:          "High confidence - should trigger",
			confidence:    0.95,
			shouldTrigger: true,
		},
		{
			name:          "Exactly at threshold",
			confidence:    0.8,
			shouldTrigger: false,
		},
		{
			name:          "Just above threshold",
			confidence:    0.81,
			shouldTrigger: true,
		},
		{
			name:          "Low confidence - should not trigger",
			confidence:    0.5,
			shouldTrigger: false,
		},
		{
			name:          "Very low confidence",
			confidence:    0.2,
			shouldTrigger: false,
		},
	}

	threshold := 0.8

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			shouldTrigger := tt.confidence > threshold
			assert.Equal(t, tt.shouldTrigger, shouldTrigger)
		})
	}
}

func TestVitalSignsData(t *testing.T) {
	vitals := &models.VitalSigns{
		HeartRate:   72,
		SpO2:        98,
		Temperature: 36.8,
		BloodPressure: &models.BloodPressure{
			Systolic:  120,
			Diastolic: 80,
		},
	}

	// Marshal and unmarshal
	data, err := json.Marshal(vitals)
	assert.NoError(t, err)

	var unmarshaled models.VitalSigns
	err = json.Unmarshal(data, &unmarshaled)
	assert.NoError(t, err)

	assert.Equal(t, vitals.HeartRate, unmarshaled.HeartRate)
	assert.Equal(t, vitals.SpO2, unmarshaled.SpO2)
	assert.Equal(t, vitals.Temperature, unmarshaled.Temperature)
	assert.NotNil(t, unmarshaled.BloodPressure)
	assert.Equal(t, vitals.BloodPressure.Systolic, unmarshaled.BloodPressure.Systolic)
	assert.Equal(t, vitals.BloodPressure.Diastolic, unmarshaled.BloodPressure.Diastolic)
}

func TestTimestampParsing(t *testing.T) {
	timestampStr := "2024-01-15T10:30:00Z"
	timestamp, err := time.Parse(time.RFC3339, timestampStr)
	assert.NoError(t, err)
	assert.Equal(t, 2024, timestamp.Year())
	assert.Equal(t, time.January, timestamp.Month())
	assert.Equal(t, 15, timestamp.Day())
}
