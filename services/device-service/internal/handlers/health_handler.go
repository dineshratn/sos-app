package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/rs/zerolog"
	"github.com/sos-app/device-service/internal/mqtt"
)

// HealthHandler handles health check requests
type HealthHandler struct {
	mqttClient *mqtt.Client
	logger     zerolog.Logger
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(mqttClient *mqtt.Client, logger zerolog.Logger) *HealthHandler {
	return &HealthHandler{
		mqttClient: mqttClient,
		logger:     logger,
	}
}

// HealthCheck handles GET /health
func (h *HealthHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	status := "healthy"
	mqttStatus := "connected"

	if h.mqttClient != nil && !h.mqttClient.IsConnected() {
		mqttStatus = "disconnected"
		status = "degraded"
	}

	response := map[string]interface{}{
		"status": status,
		"mqtt":   mqttStatus,
	}

	w.Header().Set("Content-Type", "application/json")
	if status != "healthy" {
		w.WriteHeader(http.StatusServiceUnavailable)
	} else {
		w.WriteHeader(http.StatusOK)
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		h.logger.Error().Err(err).Msg("Failed to encode health check response")
	}
}
