package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/rs/zerolog/log"
	"github.com/sos-app/emergency-service/internal/kafka"
	"github.com/sos-app/emergency-service/internal/models"
	"github.com/sos-app/emergency-service/internal/repository"
	"github.com/sos-app/emergency-service/internal/services"
)

// EmergencyHandler handles HTTP requests for emergency operations
type EmergencyHandler struct {
	emergencyRepo    *repository.EmergencyRepository
	ackRepo          *repository.AcknowledgmentRepository
	producer         *kafka.Producer
	countdownService *services.CountdownService
	escalationService *services.EscalationService
	countdownSeconds int
}

// NewEmergencyHandler creates a new EmergencyHandler
func NewEmergencyHandler(
	emergencyRepo *repository.EmergencyRepository,
	ackRepo *repository.AcknowledgmentRepository,
	producer *kafka.Producer,
	countdownService *services.CountdownService,
	escalationService *services.EscalationService,
	countdownSeconds int,
) *EmergencyHandler {
	return &EmergencyHandler{
		emergencyRepo:     emergencyRepo,
		ackRepo:           ackRepo,
		producer:          producer,
		countdownService:  countdownService,
		escalationService: escalationService,
		countdownSeconds:  countdownSeconds,
	}
}

// TriggerEmergency handles POST /api/v1/emergency/trigger
func (h *EmergencyHandler) TriggerEmergency(w http.ResponseWriter, r *http.Request) {
	var req models.CreateEmergencyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Check if user already has an active emergency
	activeEmergency, err := h.emergencyRepo.GetActiveByUserID(r.Context(), req.UserID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to check for active emergency")
		respondError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	if activeEmergency != nil {
		respondError(w, http.StatusConflict, "User already has an active emergency")
		return
	}

	// Set countdown seconds (use default if not provided)
	countdownSec := h.countdownSeconds
	if req.CountdownSeconds != nil && *req.CountdownSeconds > 0 {
		countdownSec = *req.CountdownSeconds
	}

	// Create emergency
	emergency := &models.Emergency{
		ID:               uuid.New(),
		UserID:           req.UserID,
		EmergencyType:    req.EmergencyType,
		Status:           models.StatusPending,
		InitialLocation:  req.Location,
		InitialMessage:   req.InitialMessage,
		AutoTriggered:    req.AutoTriggered,
		TriggeredBy:      req.TriggeredBy,
		CountdownSeconds: countdownSec,
		CreatedAt:        time.Now(),
	}

	// Validate emergency
	if err := emergency.Validate(); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Save to database
	if err := h.emergencyRepo.Create(r.Context(), emergency); err != nil {
		log.Error().Err(err).Msg("Failed to create emergency")
		respondError(w, http.StatusInternalServerError, "Failed to create emergency")
		return
	}

	// Start countdown timer
	h.countdownService.StartCountdown(r.Context(), emergency.ID, countdownSec)

	log.Info().
		Str("emergency_id", emergency.ID.String()).
		Str("user_id", emergency.UserID.String()).
		Str("type", string(emergency.EmergencyType)).
		Msg("Emergency triggered successfully")

	respondJSON(w, http.StatusOK, emergency)
}

// AutoTriggerEmergency handles POST /api/v1/emergency/auto-trigger (for IoT devices)
func (h *EmergencyHandler) AutoTriggerEmergency(w http.ResponseWriter, r *http.Request) {
	var req models.CreateEmergencyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Auto-triggered emergencies have longer countdown (30 seconds for fall detection)
	countdownSec := 30
	if req.CountdownSeconds != nil && *req.CountdownSeconds > 0 {
		countdownSec = *req.CountdownSeconds
	}

	req.AutoTriggered = true
	req.CountdownSeconds = &countdownSec

	// Reuse the regular trigger logic
	h.TriggerEmergency(w, r)
}

// CancelEmergency handles PUT /api/v1/emergency/{id}/cancel
func (h *EmergencyHandler) CancelEmergency(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	emergencyID, err := uuid.Parse(vars["id"])
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid emergency ID")
		return
	}

	// Get emergency
	emergency, err := h.emergencyRepo.GetByID(r.Context(), emergencyID)
	if err != nil {
		if err == repository.ErrEmergencyNotFound {
			respondError(w, http.StatusNotFound, "Emergency not found")
			return
		}
		log.Error().Err(err).Msg("Failed to get emergency")
		respondError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	// Check if emergency can be cancelled
	if !emergency.CanBeCancelled() {
		respondError(w, http.StatusBadRequest, "Emergency cannot be cancelled")
		return
	}

	// Cancel countdown if still pending
	if emergency.IsPending() {
		h.countdownService.CancelCountdown(emergencyID)
	}

	// Update status to cancelled
	if err := h.emergencyRepo.UpdateStatus(r.Context(), emergencyID, models.StatusCancelled); err != nil {
		log.Error().Err(err).Msg("Failed to cancel emergency")
		respondError(w, http.StatusInternalServerError, "Failed to cancel emergency")
		return
	}

	// Stop escalation monitoring
	h.escalationService.StopMonitoring(emergencyID)

	// Publish cancelled event
	emergency.Status = models.StatusCancelled
	if err := h.producer.PublishEmergencyCancelled(r.Context(), emergency, "User cancelled"); err != nil {
		log.Error().Err(err).Msg("Failed to publish cancelled event")
	}

	log.Info().
		Str("emergency_id", emergencyID.String()).
		Msg("Emergency cancelled successfully")

	respondJSON(w, http.StatusOK, map[string]string{"message": "Emergency cancelled successfully"})
}

// ResolveEmergency handles PUT /api/v1/emergency/{id}/resolve
func (h *EmergencyHandler) ResolveEmergency(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	emergencyID, err := uuid.Parse(vars["id"])
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid emergency ID")
		return
	}

	var req struct {
		ResolutionNotes string `json:"resolution_notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		req.ResolutionNotes = ""
	}

	// Get emergency
	emergency, err := h.emergencyRepo.GetByID(r.Context(), emergencyID)
	if err != nil {
		if err == repository.ErrEmergencyNotFound {
			respondError(w, http.StatusNotFound, "Emergency not found")
			return
		}
		log.Error().Err(err).Msg("Failed to get emergency")
		respondError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	// Check if emergency can be resolved
	if !emergency.CanBeResolved() {
		respondError(w, http.StatusBadRequest, "Emergency is not active")
		return
	}

	// Resolve emergency
	if err := h.emergencyRepo.Resolve(r.Context(), emergencyID, req.ResolutionNotes); err != nil {
		log.Error().Err(err).Msg("Failed to resolve emergency")
		respondError(w, http.StatusInternalServerError, "Failed to resolve emergency")
		return
	}

	// Stop escalation monitoring
	h.escalationService.StopMonitoring(emergencyID)

	// Get updated emergency
	emergency, _ = h.emergencyRepo.GetByID(r.Context(), emergencyID)

	// Publish resolved event
	if err := h.producer.PublishEmergencyResolved(r.Context(), emergency); err != nil {
		log.Error().Err(err).Msg("Failed to publish resolved event")
	}

	log.Info().
		Str("emergency_id", emergencyID.String()).
		Msg("Emergency resolved successfully")

	respondJSON(w, http.StatusOK, emergency)
}

// GetEmergency handles GET /api/v1/emergency/{id}
func (h *EmergencyHandler) GetEmergency(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	emergencyID, err := uuid.Parse(vars["id"])
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid emergency ID")
		return
	}

	// Get emergency
	emergency, err := h.emergencyRepo.GetByID(r.Context(), emergencyID)
	if err != nil {
		if err == repository.ErrEmergencyNotFound {
			respondError(w, http.StatusNotFound, "Emergency not found")
			return
		}
		log.Error().Err(err).Msg("Failed to get emergency")
		respondError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	// Get acknowledgments
	acknowledgments, err := h.ackRepo.GetByEmergencyID(r.Context(), emergencyID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get acknowledgments")
		acknowledgments = []models.EmergencyAcknowledgment{}
	}

	response := models.EmergencyResponse{
		Emergency:       *emergency,
		Acknowledgments: acknowledgments,
	}

	respondJSON(w, http.StatusOK, response)
}

// GetEmergencyHistory handles GET /api/v1/emergency/history
func (h *EmergencyHandler) GetEmergencyHistory(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	userIDStr := r.URL.Query().Get("user_id")
	if userIDStr == "" {
		respondError(w, http.StatusBadRequest, "user_id is required")
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user_id")
		return
	}

	page := 1
	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	pageSize := 20
	if sizeStr := r.URL.Query().Get("page_size"); sizeStr != "" {
		if s, err := strconv.Atoi(sizeStr); err == nil && s > 0 && s <= 100 {
			pageSize = s
		}
	}

	filters := models.HistoryFilters{
		UserID:   userID,
		Page:     page,
		PageSize: pageSize,
	}

	// Get emergencies
	emergencies, total, err := h.emergencyRepo.ListWithFilters(r.Context(), filters)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get emergency history")
		respondError(w, http.StatusInternalServerError, "Failed to get emergency history")
		return
	}

	response := models.EmergencyListResponse{
		Emergencies: emergencies,
		Total:       total,
		Page:        page,
		PageSize:    pageSize,
	}

	respondJSON(w, http.StatusOK, response)
}

// AcknowledgeEmergency handles POST /api/v1/emergency/{id}/acknowledge
func (h *EmergencyHandler) AcknowledgeEmergency(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	emergencyID, err := uuid.Parse(vars["id"])
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid emergency ID")
		return
	}

	var req models.CreateAcknowledgmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	req.EmergencyID = emergencyID

	// Verify emergency exists and is active
	emergency, err := h.emergencyRepo.GetByID(r.Context(), emergencyID)
	if err != nil {
		if err == repository.ErrEmergencyNotFound {
			respondError(w, http.StatusNotFound, "Emergency not found")
			return
		}
		log.Error().Err(err).Msg("Failed to get emergency")
		respondError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	if !emergency.IsActive() && !emergency.IsPending() {
		respondError(w, http.StatusBadRequest, "Emergency is not active")
		return
	}

	// Create acknowledgment
	ack := &models.EmergencyAcknowledgment{
		EmergencyID:  req.EmergencyID,
		ContactID:    req.ContactID,
		ContactName:  req.ContactName,
		ContactPhone: req.ContactPhone,
		ContactEmail: req.ContactEmail,
		Location:     req.Location,
		Message:      req.Message,
	}

	// Validate
	if err := ack.Validate(); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Save acknowledgment
	if err := h.ackRepo.Create(r.Context(), ack); err != nil {
		if err == repository.ErrDuplicateAcknowledgment {
			respondError(w, http.StatusConflict, "Already acknowledged")
			return
		}
		log.Error().Err(err).Msg("Failed to create acknowledgment")
		respondError(w, http.StatusInternalServerError, "Failed to acknowledge emergency")
		return
	}

	log.Info().
		Str("emergency_id", emergencyID.String()).
		Str("contact_id", req.ContactID.String()).
		Msg("Emergency acknowledged successfully")

	respondJSON(w, http.StatusOK, ack)
}

// Helper functions

func respondJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
