package services

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"github.com/sos-app/emergency-service/internal/repository"
)

// EscalationService manages escalation logic for unacknowledged emergencies
type EscalationService struct {
	emergencyRepo      *repository.EmergencyRepository
	ackRepo            *repository.AcknowledgmentRepository
	escalationTimeout  time.Duration
	activeEscalations  map[uuid.UUID]*time.Timer
	mu                 sync.RWMutex
}

// NewEscalationService creates a new EscalationService
func NewEscalationService(
	emergencyRepo *repository.EmergencyRepository,
	ackRepo *repository.AcknowledgmentRepository,
	escalationTimeoutMin int,
) *EscalationService {
	return &EscalationService{
		emergencyRepo:     emergencyRepo,
		ackRepo:           ackRepo,
		escalationTimeout: time.Duration(escalationTimeoutMin) * time.Minute,
		activeEscalations: make(map[uuid.UUID]*time.Timer),
	}
}

// StartMonitoring begins monitoring an emergency for escalation
func (s *EscalationService) StartMonitoring(ctx context.Context, emergencyID uuid.UUID) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Check if already monitoring
	if _, exists := s.activeEscalations[emergencyID]; exists {
		log.Warn().
			Str("emergency_id", emergencyID.String()).
			Msg("Already monitoring emergency for escalation")
		return
	}

	log.Info().
		Str("emergency_id", emergencyID.String()).
		Dur("timeout", s.escalationTimeout).
		Msg("Starting escalation monitoring")

	// Create timer for escalation check
	timer := time.AfterFunc(s.escalationTimeout, func() {
		s.checkEscalation(ctx, emergencyID)
	})

	s.activeEscalations[emergencyID] = timer
}

// StopMonitoring stops monitoring an emergency for escalation
func (s *EscalationService) StopMonitoring(emergencyID uuid.UUID) {
	s.mu.Lock()
	defer s.mu.Unlock()

	timer, exists := s.activeEscalations[emergencyID]
	if !exists {
		return
	}

	timer.Stop()
	delete(s.activeEscalations, emergencyID)

	log.Info().
		Str("emergency_id", emergencyID.String()).
		Msg("Stopped escalation monitoring")
}

// checkEscalation checks if escalation is needed for an emergency
func (s *EscalationService) checkEscalation(ctx context.Context, emergencyID uuid.UUID) {
	log.Info().
		Str("emergency_id", emergencyID.String()).
		Msg("Checking if escalation is needed")

	// Remove from active escalations
	s.mu.Lock()
	delete(s.activeEscalations, emergencyID)
	s.mu.Unlock()

	// Check if emergency is still active
	emergency, err := s.emergencyRepo.GetByID(ctx, emergencyID)
	if err != nil {
		log.Error().
			Err(err).
			Str("emergency_id", emergencyID.String()).
			Msg("Failed to retrieve emergency for escalation check")
		return
	}

	// Don't escalate if emergency is no longer active
	if !emergency.IsActive() {
		log.Info().
			Str("emergency_id", emergencyID.String()).
			Str("status", string(emergency.Status)).
			Msg("Emergency no longer active - skipping escalation")
		return
	}

	// Check if any contacts have acknowledged
	count, err := s.ackRepo.CountAcknowledgments(ctx, emergencyID)
	if err != nil {
		log.Error().
			Err(err).
			Str("emergency_id", emergencyID.String()).
			Msg("Failed to count acknowledgments")
		return
	}

	if count > 0 {
		log.Info().
			Str("emergency_id", emergencyID.String()).
			Int("acknowledgments", count).
			Msg("Emergency has acknowledgments - no escalation needed")
		return
	}

	// No acknowledgments - trigger escalation
	log.Warn().
		Str("emergency_id", emergencyID.String()).
		Msg("No acknowledgments received - escalation required")

	// TODO: Publish escalation event to Kafka
	// This will be picked up by the Notification Service to notify secondary contacts
	// For now, we just log it

	// The escalation event would trigger:
	// 1. Notification to secondary contacts
	// 2. More aggressive notification strategies (e.g., repeated calls)
	// 3. Potentially notify emergency services directly

	log.Info().
		Str("emergency_id", emergencyID.String()).
		Msg("Escalation event would be published here")
}

// GetActiveMonitoring returns the count of emergencies being monitored
func (s *EscalationService) GetActiveMonitoring() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.activeEscalations)
}

// Cleanup stops all active escalation monitors (used during shutdown)
func (s *EscalationService) Cleanup() {
	s.mu.Lock()
	defer s.mu.Unlock()

	log.Info().
		Int("count", len(s.activeEscalations)).
		Msg("Cleaning up escalation monitors")

	for id, timer := range s.activeEscalations {
		timer.Stop()
		log.Debug().
			Str("emergency_id", id.String()).
			Msg("Stopped escalation monitor")
	}

	s.activeEscalations = make(map[uuid.UUID]*time.Timer)
}
