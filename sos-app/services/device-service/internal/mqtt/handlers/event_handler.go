package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/rs/zerolog"
	"github.com/sos-app/device-service/internal/models"
	"github.com/sos-app/device-service/internal/repository"
)

// EventHandler handles device events like fall detection
type EventHandler struct {
	deviceRepo         *repository.DeviceRepository
	emergencyServiceURL string
	httpClient         *http.Client
	logger             zerolog.Logger
}

// NewEventHandler creates a new event handler
func NewEventHandler(
	deviceRepo *repository.DeviceRepository,
	emergencyServiceURL string,
	logger zerolog.Logger,
) *EventHandler {
	return &EventHandler{
		deviceRepo:         deviceRepo,
		emergencyServiceURL: emergencyServiceURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		logger: logger,
	}
}

// Handle processes device events
func (h *EventHandler) Handle(topic string, payload []byte) error {
	// Extract device ID from topic (devices/{deviceID}/events)
	parts := strings.Split(topic, "/")
	if len(parts) != 3 {
		return fmt.Errorf("invalid topic format: %s", topic)
	}
	deviceID := parts[1]

	h.logger.Info().
		Str("device_id", deviceID).
		Msg("Processing device event")

	// Parse event data
	var event models.DeviceEvent
	if err := json.Unmarshal(payload, &event); err != nil {
		h.logger.Error().
			Err(err).
			Str("device_id", deviceID).
			Msg("Failed to unmarshal event data")
		return fmt.Errorf("failed to unmarshal event: %w", err)
	}

	event.DeviceID = deviceID
	ctx := context.Background()

	// Update last seen timestamp
	if err := h.deviceRepo.UpdateLastSeen(ctx, deviceID); err != nil {
		h.logger.Error().
			Err(err).
			Str("device_id", deviceID).
			Msg("Failed to update last seen")
	}

	// Process event based on type
	switch event.EventType {
	case models.EventTypeFallDetected:
		return h.handleFallDetection(ctx, event)
	case models.EventTypeSOSButtonPressed:
		return h.handleSOSButton(ctx, event)
	case models.EventTypeGeofenceExit:
		return h.handleGeofenceExit(ctx, event)
	default:
		h.logger.Warn().
			Str("device_id", deviceID).
			Str("event_type", event.EventType).
			Msg("Unknown event type")
	}

	return nil
}

// handleFallDetection processes fall detection events
func (h *EventHandler) handleFallDetection(ctx context.Context, event models.DeviceEvent) error {
	h.logger.Info().
		Str("device_id", event.DeviceID).
		Float64("confidence", event.Confidence).
		Msg("Fall detected event received")

	// Get device to retrieve user ID
	device, err := h.deviceRepo.GetByID(ctx, event.DeviceID)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("device_id", event.DeviceID).
			Msg("Failed to get device for fall detection")
		return err
	}

	// Auto-trigger emergency if confidence > 0.8
	if event.Confidence > 0.8 {
		h.logger.Info().
			Str("device_id", event.DeviceID).
			Str("user_id", device.UserID).
			Float64("confidence", event.Confidence).
			Msg("High confidence fall detected, triggering emergency")

		if err := h.triggerEmergency(ctx, device, event, "Fall detected with high confidence"); err != nil {
			h.logger.Error().
				Err(err).
				Str("device_id", event.DeviceID).
				Msg("Failed to trigger emergency for fall detection")
			return err
		}
	} else {
		h.logger.Info().
			Str("device_id", event.DeviceID).
			Float64("confidence", event.Confidence).
			Msg("Fall detected with low confidence, sending notification only")

		// For lower confidence, send notification but don't auto-trigger
		// This would typically call a notification service
		// For now, just log it
	}

	return nil
}

// handleSOSButton processes SOS button press events
func (h *EventHandler) handleSOSButton(ctx context.Context, event models.DeviceEvent) error {
	h.logger.Info().
		Str("device_id", event.DeviceID).
		Msg("SOS button pressed event received")

	// Get device to retrieve user ID
	device, err := h.deviceRepo.GetByID(ctx, event.DeviceID)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("device_id", event.DeviceID).
			Msg("Failed to get device for SOS button")
		return err
	}

	// Immediately trigger emergency
	h.logger.Info().
		Str("device_id", event.DeviceID).
		Str("user_id", device.UserID).
		Msg("SOS button pressed, triggering emergency immediately")

	if err := h.triggerEmergency(ctx, device, event, "SOS button pressed"); err != nil {
		h.logger.Error().
			Err(err).
			Str("device_id", event.DeviceID).
			Msg("Failed to trigger emergency for SOS button")
		return err
	}

	return nil
}

// handleGeofenceExit processes geofence exit events
func (h *EventHandler) handleGeofenceExit(ctx context.Context, event models.DeviceEvent) error {
	h.logger.Info().
		Str("device_id", event.DeviceID).
		Msg("Geofence exit event received")

	// For geofence exit, typically send notification but don't auto-trigger emergency
	// This would call a notification service
	// For now, just log it

	return nil
}

// triggerEmergency calls the Emergency Service to auto-trigger an emergency
func (h *EventHandler) triggerEmergency(ctx context.Context, device *models.Device, event models.DeviceEvent, reason string) error {
	// Prepare request payload
	payload := map[string]interface{}{
		"user_id":     device.UserID,
		"device_id":   device.ID,
		"event_type":  event.EventType,
		"reason":      reason,
		"timestamp":   event.Timestamp,
		"confidence":  event.Confidence,
		"event_data":  event.Data,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal emergency payload: %w", err)
	}

	// Call Emergency Service auto-trigger endpoint
	url := fmt.Sprintf("%s/api/v1/emergency/auto-trigger", h.emergencyServiceURL)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return fmt.Errorf("failed to create emergency request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := h.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to call emergency service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("emergency service returned status %d", resp.StatusCode)
	}

	h.logger.Info().
		Str("device_id", device.ID).
		Str("user_id", device.UserID).
		Str("reason", reason).
		Msg("Emergency triggered successfully")

	return nil
}
