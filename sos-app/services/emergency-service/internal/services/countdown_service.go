package services

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"github.com/sos-app/emergency-service/internal/kafka"
	"github.com/sos-app/emergency-service/internal/models"
	"github.com/sos-app/emergency-service/internal/repository"
)

// CountdownService manages countdown timers for emergency triggers
type CountdownService struct {
	emergencyRepo *repository.EmergencyRepository
	producer      *kafka.Producer
	timers        map[uuid.UUID]*time.Timer
	mu            sync.RWMutex
}

// NewCountdownService creates a new CountdownService
func NewCountdownService(emergencyRepo *repository.EmergencyRepository, producer *kafka.Producer) *CountdownService {
	return &CountdownService{
		emergencyRepo: emergencyRepo,
		producer:      producer,
		timers:        make(map[uuid.UUID]*time.Timer),
	}
}

// StartCountdown initiates a countdown timer for an emergency
func (s *CountdownService) StartCountdown(ctx context.Context, emergencyID uuid.UUID, countdownSeconds int) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Check if timer already exists
	if _, exists := s.timers[emergencyID]; exists {
		log.Warn().
			Str("emergency_id", emergencyID.String()).
			Msg("Countdown timer already exists for this emergency")
		return
	}

	duration := time.Duration(countdownSeconds) * time.Second

	log.Info().
		Str("emergency_id", emergencyID.String()).
		Int("countdown_seconds", countdownSeconds).
		Msg("Starting countdown timer")

	// Create timer
	timer := time.AfterFunc(duration, func() {
		s.onCountdownComplete(ctx, emergencyID)
	})

	// Store timer
	s.timers[emergencyID] = timer
}

// CancelCountdown cancels an ongoing countdown timer
func (s *CountdownService) CancelCountdown(emergencyID uuid.UUID) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	timer, exists := s.timers[emergencyID]
	if !exists {
		log.Warn().
			Str("emergency_id", emergencyID.String()).
			Msg("No countdown timer found for this emergency")
		return false
	}

	// Stop the timer
	stopped := timer.Stop()

	// Remove from map
	delete(s.timers, emergencyID)

	log.Info().
		Str("emergency_id", emergencyID.String()).
		Bool("stopped", stopped).
		Msg("Countdown timer cancelled")

	return stopped
}

// onCountdownComplete is called when countdown timer expires
func (s *CountdownService) onCountdownComplete(ctx context.Context, emergencyID uuid.UUID) {
	log.Info().
		Str("emergency_id", emergencyID.String()).
		Msg("Countdown complete - activating emergency")

	// Remove timer from map
	s.mu.Lock()
	delete(s.timers, emergencyID)
	s.mu.Unlock()

	// Retrieve emergency
	emergency, err := s.emergencyRepo.GetByID(ctx, emergencyID)
	if err != nil {
		log.Error().
			Err(err).
			Str("emergency_id", emergencyID.String()).
			Msg("Failed to retrieve emergency after countdown")
		return
	}

	// Check if still in PENDING status (not cancelled)
	if emergency.Status != models.StatusPending {
		log.Info().
			Str("emergency_id", emergencyID.String()).
			Str("status", string(emergency.Status)).
			Msg("Emergency no longer pending - skipping activation")
		return
	}

	// Update status to ACTIVE
	err = s.emergencyRepo.UpdateStatus(ctx, emergencyID, models.StatusActive)
	if err != nil {
		log.Error().
			Err(err).
			Str("emergency_id", emergencyID.String()).
			Msg("Failed to activate emergency")
		return
	}

	log.Info().
		Str("emergency_id", emergencyID.String()).
		Msg("Emergency activated successfully")

	// Retrieve updated emergency
	emergency, err = s.emergencyRepo.GetByID(ctx, emergencyID)
	if err != nil {
		log.Error().
			Err(err).
			Str("emergency_id", emergencyID.String()).
			Msg("Failed to retrieve emergency after activation")
		return
	}

	// Publish EmergencyCreated event to Kafka
	err = s.producer.PublishEmergencyCreated(ctx, emergency)
	if err != nil {
		log.Error().
			Err(err).
			Str("emergency_id", emergencyID.String()).
			Msg("Failed to publish EmergencyCreated event")
		return
	}

	log.Info().
		Str("emergency_id", emergencyID.String()).
		Msg("EmergencyCreated event published successfully")
}

// GetActiveTimers returns the count of active countdown timers
func (s *CountdownService) GetActiveTimers() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.timers)
}

// IsTimerActive checks if a countdown timer is active for an emergency
func (s *CountdownService) IsTimerActive(emergencyID uuid.UUID) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	_, exists := s.timers[emergencyID]
	return exists
}

// Cleanup stops all active timers (used during shutdown)
func (s *CountdownService) Cleanup() {
	s.mu.Lock()
	defer s.mu.Unlock()

	log.Info().
		Int("count", len(s.timers)).
		Msg("Cleaning up countdown timers")

	for id, timer := range s.timers {
		timer.Stop()
		log.Debug().
			Str("emergency_id", id.String()).
			Msg("Stopped countdown timer")
	}

	// Clear map
	s.timers = make(map[uuid.UUID]*time.Timer)
}
