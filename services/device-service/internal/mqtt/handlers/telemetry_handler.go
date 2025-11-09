package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/rs/zerolog"
	"github.com/sos-app/device-service/internal/models"
	"github.com/sos-app/device-service/internal/repository"
	"github.com/sos-app/device-service/internal/services"
)

// TelemetryHandler handles telemetry data from IoT devices
type TelemetryHandler struct {
	deviceRepo      *repository.DeviceRepository
	vitalsService   *services.VitalsService
	batteryMonitor  *services.BatteryMonitor
	logger          zerolog.Logger
}

// NewTelemetryHandler creates a new telemetry handler
func NewTelemetryHandler(
	deviceRepo *repository.DeviceRepository,
	vitalsService *services.VitalsService,
	batteryMonitor *services.BatteryMonitor,
	logger zerolog.Logger,
) *TelemetryHandler {
	return &TelemetryHandler{
		deviceRepo:     deviceRepo,
		vitalsService:  vitalsService,
		batteryMonitor: batteryMonitor,
		logger:         logger,
	}
}

// Handle processes telemetry messages
func (h *TelemetryHandler) Handle(topic string, payload []byte) error {
	// Extract device ID from topic (devices/{deviceID}/telemetry)
	parts := strings.Split(topic, "/")
	if len(parts) != 3 {
		return fmt.Errorf("invalid topic format: %s", topic)
	}
	deviceID := parts[1]

	h.logger.Info().
		Str("device_id", deviceID).
		Msg("Processing telemetry data")

	// Parse telemetry data
	var telemetry models.TelemetryData
	if err := json.Unmarshal(payload, &telemetry); err != nil {
		h.logger.Error().
			Err(err).
			Str("device_id", deviceID).
			Msg("Failed to unmarshal telemetry data")
		return fmt.Errorf("failed to unmarshal telemetry: %w", err)
	}

	telemetry.DeviceID = deviceID
	ctx := context.Background()

	// Update last seen timestamp
	if err := h.deviceRepo.UpdateLastSeen(ctx, deviceID); err != nil {
		h.logger.Error().
			Err(err).
			Str("device_id", deviceID).
			Msg("Failed to update last seen")
	}

	// Process battery level
	if telemetry.BatteryLevel > 0 {
		if err := h.processBatteryLevel(ctx, deviceID, telemetry.BatteryLevel); err != nil {
			h.logger.Error().
				Err(err).
				Str("device_id", deviceID).
				Msg("Failed to process battery level")
		}
	}

	// Process vital signs
	if telemetry.VitalSigns != nil {
		if err := h.processVitalSigns(ctx, deviceID, telemetry.VitalSigns); err != nil {
			h.logger.Error().
				Err(err).
				Str("device_id", deviceID).
				Msg("Failed to process vital signs")
		}
	}

	// Process connectivity status - mark device as ACTIVE
	device, err := h.deviceRepo.GetByID(ctx, deviceID)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("device_id", deviceID).
			Msg("Failed to get device")
		return err
	}

	if device.Status == models.DeviceStatusDisconnected {
		if err := h.deviceRepo.UpdateStatus(ctx, deviceID, models.DeviceStatusActive); err != nil {
			h.logger.Error().
				Err(err).
				Str("device_id", deviceID).
				Msg("Failed to update device status to ACTIVE")
		} else {
			h.logger.Info().
				Str("device_id", deviceID).
				Msg("Device reconnected, status updated to ACTIVE")
		}
	}

	h.logger.Info().
		Str("device_id", deviceID).
		Int("battery_level", telemetry.BatteryLevel).
		Msg("Telemetry data processed successfully")

	return nil
}

// processBatteryLevel updates battery level and checks for low battery
func (h *TelemetryHandler) processBatteryLevel(ctx context.Context, deviceID string, batteryLevel int) error {
	// Update battery level in database
	if err := h.deviceRepo.UpdateBatteryLevel(ctx, deviceID, batteryLevel); err != nil {
		return err
	}

	// Check for low battery and send alert
	if batteryLevel <= 20 {
		device, err := h.deviceRepo.GetByID(ctx, deviceID)
		if err != nil {
			return err
		}

		if err := h.batteryMonitor.CheckAndNotify(ctx, device, batteryLevel); err != nil {
			h.logger.Error().
				Err(err).
				Str("device_id", deviceID).
				Int("battery_level", batteryLevel).
				Msg("Failed to send low battery notification")
		}
	}

	return nil
}

// processVitalSigns processes vital signs data
func (h *TelemetryHandler) processVitalSigns(ctx context.Context, deviceID string, vitals *models.VitalSigns) error {
	device, err := h.deviceRepo.GetByID(ctx, deviceID)
	if err != nil {
		return err
	}

	// Monitor vital signs and send alerts if thresholds exceeded
	if err := h.vitalsService.MonitorVitalSigns(ctx, device, vitals); err != nil {
		h.logger.Error().
			Err(err).
			Str("device_id", deviceID).
			Msg("Failed to monitor vital signs")
		return err
	}

	return nil
}
