package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/rs/zerolog"
	"github.com/sos-app/device-service/internal/models"
	"github.com/sos-app/device-service/internal/repository"
)

// SOSHandler handles SOS button press events specifically
type SOSHandler struct {
	deviceRepo         *repository.DeviceRepository
	emergencyServiceURL string
	httpClient         *http.Client
	logger             zerolog.Logger
}

// NewSOSHandler creates a new SOS handler
func NewSOSHandler(
	deviceRepo *repository.DeviceRepository,
	emergencyServiceURL string,
	logger zerolog.Logger,
) *SOSHandler {
	return &SOSHandler{
		deviceRepo:         deviceRepo,
		emergencyServiceURL: emergencyServiceURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		logger: logger,
	}
}

// HandleSOSButtonPress processes SOS button press events immediately
func (h *SOSHandler) HandleSOSButtonPress(ctx context.Context, event models.DeviceEvent) error {
	h.logger.Warn().
		Str("device_id", event.DeviceID).
		Time("timestamp", event.Timestamp).
		Msg("CRITICAL: SOS button pressed")

	// Get device to retrieve user ID
	device, err := h.deviceRepo.GetByID(ctx, event.DeviceID)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("device_id", event.DeviceID).
			Msg("CRITICAL: Failed to get device for SOS button - emergency may not be triggered")
		return fmt.Errorf("failed to get device: %w", err)
	}

	// Log critical information
	h.logger.Warn().
		Str("device_id", event.DeviceID).
		Str("user_id", device.UserID).
		Str("device_type", string(device.DeviceType)).
		Str("manufacturer", device.Manufacturer).
		Str("model", device.Model).
		Msg("CRITICAL: Triggering emergency for SOS button press")

	// Immediately trigger emergency
	if err := h.triggerEmergencyImmediately(ctx, device, event); err != nil {
		h.logger.Error().
			Err(err).
			Str("device_id", event.DeviceID).
			Str("user_id", device.UserID).
			Msg("CRITICAL: Failed to trigger emergency for SOS button press")
		return err
	}

	h.logger.Info().
		Str("device_id", event.DeviceID).
		Str("user_id", device.UserID).
		Msg("Emergency triggered successfully for SOS button press")

	return nil
}

// triggerEmergencyImmediately calls the Emergency Service to immediately trigger an emergency
func (h *SOSHandler) triggerEmergencyImmediately(ctx context.Context, device *models.Device, event models.DeviceEvent) error {
	// Prepare emergency request payload
	payload := map[string]interface{}{
		"user_id":     device.UserID,
		"device_id":   device.ID,
		"event_type":  models.EventTypeSOSButtonPressed,
		"reason":      "SOS button pressed - immediate emergency",
		"priority":    "HIGH",
		"timestamp":   event.Timestamp,
		"device_info": map[string]interface{}{
			"type":         device.DeviceType,
			"manufacturer": device.Manufacturer,
			"model":        device.Model,
			"mac_address":  device.MacAddress,
			"battery":      device.BatteryLevel,
		},
		"event_data": event.Data,
	}

	// Add location if available
	if location, ok := event.Data["location"].(map[string]interface{}); ok {
		payload["location"] = location
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal emergency payload: %w", err)
	}

	// Call Emergency Service auto-trigger endpoint
	url := fmt.Sprintf("%s/api/v1/emergency/auto-trigger", h.emergencyServiceURL)

	h.logger.Info().
		Str("url", url).
		Str("device_id", device.ID).
		Msg("Calling emergency service auto-trigger endpoint")

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return fmt.Errorf("failed to create emergency request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Device-ID", device.ID)
	req.Header.Set("X-User-ID", device.UserID)

	resp, err := h.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to call emergency service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		// Read response body for error details
		var errorResponse map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&errorResponse); err == nil {
			h.logger.Error().
				Int("status_code", resp.StatusCode).
				Interface("error", errorResponse).
				Msg("Emergency service returned error response")
		}
		return fmt.Errorf("emergency service returned status %d", resp.StatusCode)
	}

	// Log successful trigger
	h.logger.Info().
		Str("device_id", device.ID).
		Str("user_id", device.UserID).
		Int("status_code", resp.StatusCode).
		Msg("CRITICAL: Emergency triggered successfully via Emergency Service")

	return nil
}
