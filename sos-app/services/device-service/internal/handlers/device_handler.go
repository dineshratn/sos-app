package handlers

import (
	"encoding/json"
	"net/http"
	"regexp"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/rs/zerolog"
	"github.com/sos-app/device-service/internal/models"
	"github.com/sos-app/device-service/internal/mqtt"
	"github.com/sos-app/device-service/internal/repository"
)

// DeviceHandler handles device-related HTTP requests
type DeviceHandler struct {
	deviceRepo *repository.DeviceRepository
	mqttClient *mqtt.Client
	logger     zerolog.Logger
}

// NewDeviceHandler creates a new device handler
func NewDeviceHandler(
	deviceRepo *repository.DeviceRepository,
	mqttClient *mqtt.Client,
	logger zerolog.Logger,
) *DeviceHandler {
	return &DeviceHandler{
		deviceRepo: deviceRepo,
		mqttClient: mqttClient,
		logger:     logger,
	}
}

// PairDevice handles POST /api/v1/devices/pair
func (h *DeviceHandler) PairDevice(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context (set by auth middleware)
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		h.logger.Error().Msg("Missing user ID in request")
		h.respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Parse request body
	var req models.PairDeviceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error().Err(err).Msg("Failed to decode request body")
		h.respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate MAC address format
	if !isValidMacAddress(req.MacAddress) {
		h.logger.Error().Str("mac_address", req.MacAddress).Msg("Invalid MAC address format")
		h.respondError(w, http.StatusBadRequest, "Invalid MAC address format")
		return
	}

	// Check if device with this MAC address already exists
	existingDevice, err := h.deviceRepo.GetByMacAddress(r.Context(), req.MacAddress)
	if err == nil && existingDevice != nil {
		h.logger.Error().
			Str("mac_address", req.MacAddress).
			Str("existing_device_id", existingDevice.ID).
			Msg("Device with this MAC address already paired")
		h.respondError(w, http.StatusConflict, "Device already paired")
		return
	}

	// Create device
	device := &models.Device{
		ID:           uuid.New().String(),
		UserID:       userID,
		DeviceType:   req.DeviceType,
		Manufacturer: req.Manufacturer,
		Model:        req.Model,
		MacAddress:   req.MacAddress,
		PairedAt:     time.Now(),
		BatteryLevel: 100,
		Status:       models.DeviceStatusActive,
		Capabilities: req.Capabilities,
		Settings:     make(map[string]interface{}),
	}

	if err := h.deviceRepo.Create(r.Context(), device); err != nil {
		h.logger.Error().Err(err).Msg("Failed to create device")
		h.respondError(w, http.StatusInternalServerError, "Failed to pair device")
		return
	}

	// Subscribe to device's MQTT topics
	if h.mqttClient.IsConnected() {
		if err := h.mqttClient.SubscribeToSpecificDevice(device.ID, func(topic string, payload []byte) error {
			h.logger.Info().
				Str("device_id", device.ID).
				Str("topic", topic).
				Msg("Received message from newly paired device")
			return nil
		}); err != nil {
			h.logger.Error().
				Err(err).
				Str("device_id", device.ID).
				Msg("Failed to subscribe to device MQTT topics")
		}
	}

	h.logger.Info().
		Str("device_id", device.ID).
		Str("user_id", userID).
		Str("mac_address", req.MacAddress).
		Msg("Device paired successfully")

	h.respondJSON(w, http.StatusCreated, device)
}

// UnpairDevice handles DELETE /api/v1/devices/:id
func (h *DeviceHandler) UnpairDevice(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		h.respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get device ID from URL
	vars := mux.Vars(r)
	deviceID := vars["id"]

	// Get device to verify ownership
	device, err := h.deviceRepo.GetByID(r.Context(), deviceID)
	if err != nil {
		h.logger.Error().Err(err).Str("device_id", deviceID).Msg("Device not found")
		h.respondError(w, http.StatusNotFound, "Device not found")
		return
	}

	// Verify user owns this device
	if device.UserID != userID {
		h.logger.Error().
			Str("device_id", deviceID).
			Str("user_id", userID).
			Str("device_user_id", device.UserID).
			Msg("User does not own this device")
		h.respondError(w, http.StatusForbidden, "Access denied")
		return
	}

	// Unsubscribe from MQTT topics
	if h.mqttClient.IsConnected() {
		if err := h.mqttClient.UnsubscribeFromDevice(deviceID); err != nil {
			h.logger.Error().
				Err(err).
				Str("device_id", deviceID).
				Msg("Failed to unsubscribe from device MQTT topics")
		}
	}

	// Soft delete device
	if err := h.deviceRepo.SoftDelete(r.Context(), deviceID); err != nil {
		h.logger.Error().Err(err).Str("device_id", deviceID).Msg("Failed to delete device")
		h.respondError(w, http.StatusInternalServerError, "Failed to unpair device")
		return
	}

	h.logger.Info().
		Str("device_id", deviceID).
		Str("user_id", userID).
		Msg("Device unpaired successfully")

	h.respondJSON(w, http.StatusOK, map[string]string{
		"message": "Device unpaired successfully",
	})
}

// GetUserDevices handles GET /api/v1/devices
func (h *DeviceHandler) GetUserDevices(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		h.respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get all devices for user
	devices, err := h.deviceRepo.GetByUserID(r.Context(), userID)
	if err != nil {
		h.logger.Error().Err(err).Str("user_id", userID).Msg("Failed to get user devices")
		h.respondError(w, http.StatusInternalServerError, "Failed to get devices")
		return
	}

	h.logger.Info().
		Str("user_id", userID).
		Int("count", len(devices)).
		Msg("Retrieved user devices")

	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"devices": devices,
		"count":   len(devices),
	})
}

// UpdateDeviceSettings handles PUT /api/v1/devices/:id/settings
func (h *DeviceHandler) UpdateDeviceSettings(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		h.respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get device ID from URL
	vars := mux.Vars(r)
	deviceID := vars["id"]

	// Get device to verify ownership
	device, err := h.deviceRepo.GetByID(r.Context(), deviceID)
	if err != nil {
		h.logger.Error().Err(err).Str("device_id", deviceID).Msg("Device not found")
		h.respondError(w, http.StatusNotFound, "Device not found")
		return
	}

	// Verify user owns this device
	if device.UserID != userID {
		h.logger.Error().
			Str("device_id", deviceID).
			Str("user_id", userID).
			Msg("User does not own this device")
		h.respondError(w, http.StatusForbidden, "Access denied")
		return
	}

	// Parse request body
	var req models.UpdateDeviceSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error().Err(err).Msg("Failed to decode request body")
		h.respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Update settings in database
	if err := h.deviceRepo.UpdateSettings(r.Context(), deviceID, req.Settings); err != nil {
		h.logger.Error().Err(err).Str("device_id", deviceID).Msg("Failed to update settings")
		h.respondError(w, http.StatusInternalServerError, "Failed to update device settings")
		return
	}

	// Publish settings to device via MQTT
	if h.mqttClient.IsConnected() {
		settingsJSON, err := json.Marshal(req.Settings)
		if err != nil {
			h.logger.Error().Err(err).Msg("Failed to marshal settings")
		} else {
			if err := h.mqttClient.PublishCommand(deviceID, settingsJSON); err != nil {
				h.logger.Error().
					Err(err).
					Str("device_id", deviceID).
					Msg("Failed to publish settings to device")
			} else {
				h.logger.Info().
					Str("device_id", deviceID).
					Msg("Published settings to device via MQTT")
			}
		}
	}

	h.logger.Info().
		Str("device_id", deviceID).
		Str("user_id", userID).
		Msg("Device settings updated successfully")

	// Get updated device
	updatedDevice, err := h.deviceRepo.GetByID(r.Context(), deviceID)
	if err != nil {
		h.logger.Error().Err(err).Msg("Failed to get updated device")
		h.respondError(w, http.StatusInternalServerError, "Failed to get updated device")
		return
	}

	h.respondJSON(w, http.StatusOK, updatedDevice)
}

// GetDevice handles GET /api/v1/devices/:id
func (h *DeviceHandler) GetDevice(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		h.respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get device ID from URL
	vars := mux.Vars(r)
	deviceID := vars["id"]

	// Get device
	device, err := h.deviceRepo.GetByID(r.Context(), deviceID)
	if err != nil {
		h.logger.Error().Err(err).Str("device_id", deviceID).Msg("Device not found")
		h.respondError(w, http.StatusNotFound, "Device not found")
		return
	}

	// Verify user owns this device
	if device.UserID != userID {
		h.logger.Error().
			Str("device_id", deviceID).
			Str("user_id", userID).
			Msg("User does not own this device")
		h.respondError(w, http.StatusForbidden, "Access denied")
		return
	}

	h.respondJSON(w, http.StatusOK, device)
}

// respondJSON sends a JSON response
func (h *DeviceHandler) respondJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.logger.Error().Err(err).Msg("Failed to encode response")
	}
}

// respondError sends an error response
func (h *DeviceHandler) respondError(w http.ResponseWriter, statusCode int, message string) {
	h.respondJSON(w, statusCode, map[string]string{
		"error": message,
	})
}

// isValidMacAddress validates MAC address format
func isValidMacAddress(mac string) bool {
	// Match common MAC address formats:
	// - 00:1A:2B:3C:4D:5E
	// - 00-1A-2B-3C-4D-5E
	// - 001A.2B3C.4D5E
	patterns := []string{
		`^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$`,
		`^([0-9A-Fa-f]{4}\.){2}([0-9A-Fa-f]{4})$`,
	}

	for _, pattern := range patterns {
		matched, _ := regexp.MatchString(pattern, mac)
		if matched {
			return true
		}
	}

	return false
}
