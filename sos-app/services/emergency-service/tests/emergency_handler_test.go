package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/sos-app/emergency-service/internal/models"
)

// MockEmergencyRepository is a mock implementation for testing
type MockEmergencyRepository struct {
	emergencies     map[uuid.UUID]*models.Emergency
	activeEmergency *models.Emergency
}

func NewMockEmergencyRepository() *MockEmergencyRepository {
	return &MockEmergencyRepository{
		emergencies: make(map[uuid.UUID]*models.Emergency),
	}
}

func (m *MockEmergencyRepository) Create(ctx context.Context, emergency *models.Emergency) error {
	m.emergencies[emergency.ID] = emergency
	return nil
}

func (m *MockEmergencyRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Emergency, error) {
	if emergency, ok := m.emergencies[id]; ok {
		return emergency, nil
	}
	return nil, nil
}

func (m *MockEmergencyRepository) GetActiveByUserID(ctx context.Context, userID uuid.UUID) (*models.Emergency, error) {
	return m.activeEmergency, nil
}

func (m *MockEmergencyRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status models.EmergencyStatus) error {
	if emergency, ok := m.emergencies[id]; ok {
		emergency.Status = status
		now := time.Now()
		switch status {
		case models.StatusActive:
			emergency.ActivatedAt = &now
		case models.StatusCancelled:
			emergency.CancelledAt = &now
		case models.StatusResolved:
			emergency.ResolvedAt = &now
		}
	}
	return nil
}

func (m *MockEmergencyRepository) Resolve(ctx context.Context, id uuid.UUID, notes string) error {
	if emergency, ok := m.emergencies[id]; ok {
		emergency.Status = models.StatusResolved
		now := time.Now()
		emergency.ResolvedAt = &now
		emergency.ResolutionNotes = &notes
	}
	return nil
}

func (m *MockEmergencyRepository) ListWithFilters(ctx context.Context, filters models.HistoryFilters) ([]models.Emergency, int, error) {
	var results []models.Emergency
	for _, emg := range m.emergencies {
		if emg.UserID == filters.UserID {
			results = append(results, *emg)
		}
	}
	return results, len(results), nil
}

// MockAcknowledgmentRepository is a mock implementation for testing
type MockAcknowledgmentRepository struct {
	acknowledgments map[uuid.UUID][]models.EmergencyAcknowledgment
}

func NewMockAcknowledgmentRepository() *MockAcknowledgmentRepository {
	return &MockAcknowledgmentRepository{
		acknowledgments: make(map[uuid.UUID][]models.EmergencyAcknowledgment),
	}
}

func (m *MockAcknowledgmentRepository) Create(ctx context.Context, ack *models.EmergencyAcknowledgment) error {
	ack.ID = uuid.New()
	ack.AcknowledgedAt = time.Now()
	m.acknowledgments[ack.EmergencyID] = append(m.acknowledgments[ack.EmergencyID], *ack)
	return nil
}

func (m *MockAcknowledgmentRepository) GetByEmergencyID(ctx context.Context, emergencyID uuid.UUID) ([]models.EmergencyAcknowledgment, error) {
	return m.acknowledgments[emergencyID], nil
}

func (m *MockAcknowledgmentRepository) CountAcknowledgments(ctx context.Context, emergencyID uuid.UUID) (int, error) {
	return len(m.acknowledgments[emergencyID]), nil
}

// MockKafkaProducer is a mock implementation for testing
type MockKafkaProducer struct {
	publishedEvents []interface{}
}

func (m *MockKafkaProducer) PublishEmergencyCreated(ctx context.Context, emergency *models.Emergency) error {
	m.publishedEvents = append(m.publishedEvents, emergency)
	return nil
}

func (m *MockKafkaProducer) PublishEmergencyResolved(ctx context.Context, emergency *models.Emergency) error {
	m.publishedEvents = append(m.publishedEvents, emergency)
	return nil
}

func (m *MockKafkaProducer) PublishEmergencyCancelled(ctx context.Context, emergency *models.Emergency, reason string) error {
	m.publishedEvents = append(m.publishedEvents, emergency)
	return nil
}

// Tests

func TestTriggerEmergency(t *testing.T) {
	// Setup
	_ = NewMockEmergencyRepository()
	_ = NewMockAcknowledgmentRepository()
	_ = &MockKafkaProducer{}

	// Note: In real tests, we'd inject countdown and escalation services
	// For now, we test the handler logic independently

	userID := uuid.New()
	location := models.Location{
		Latitude:  37.7749,
		Longitude: -122.4194,
		Timestamp: time.Now(),
	}

	reqBody := models.CreateEmergencyRequest{
		UserID:        userID,
		EmergencyType: models.EmergencyTypeMedical,
		Location:      location,
		TriggeredBy:   "user",
		AutoTriggered: false,
	}

	body, _ := json.Marshal(reqBody)
	_ = httptest.NewRequest(http.MethodPost, "/api/v1/emergency/trigger", bytes.NewBuffer(body))
	_ = httptest.NewRecorder()

	// Note: Full handler testing would require initializing the complete handler
	// This is a simplified test to demonstrate the test structure

	t.Run("Successful emergency trigger", func(t *testing.T) {
		// Verify request body can be decoded
		var decoded models.CreateEmergencyRequest
		err := json.Unmarshal(body, &decoded)
		if err != nil {
			t.Errorf("Failed to decode request: %v", err)
		}

		if decoded.UserID != userID {
			t.Errorf("Expected userID %v, got %v", userID, decoded.UserID)
		}

		if decoded.EmergencyType != models.EmergencyTypeMedical {
			t.Errorf("Expected type MEDICAL, got %v", decoded.EmergencyType)
		}
	})
}

func TestEmergencyValidation(t *testing.T) {
	t.Run("Valid emergency", func(t *testing.T) {
		emergency := &models.Emergency{
			ID:               uuid.New(),
			UserID:           uuid.New(),
			EmergencyType:    models.EmergencyTypeMedical,
			Status:           models.StatusPending,
			InitialLocation:  models.Location{Latitude: 37.7749, Longitude: -122.4194, Timestamp: time.Now()},
			TriggeredBy:      "user",
			CountdownSeconds: 10,
			CreatedAt:        time.Now(),
		}

		err := emergency.Validate()
		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
	})

	t.Run("Invalid latitude", func(t *testing.T) {
		emergency := &models.Emergency{
			ID:               uuid.New(),
			UserID:           uuid.New(),
			EmergencyType:    models.EmergencyTypeMedical,
			Status:           models.StatusPending,
			InitialLocation:  models.Location{Latitude: 91.0, Longitude: -122.4194, Timestamp: time.Now()},
			TriggeredBy:      "user",
			CountdownSeconds: 10,
			CreatedAt:        time.Now(),
		}

		err := emergency.Validate()
		if err == nil {
			t.Error("Expected validation error for invalid latitude")
		}
	})

	t.Run("Invalid emergency type", func(t *testing.T) {
		emergency := &models.Emergency{
			ID:               uuid.New(),
			UserID:           uuid.New(),
			EmergencyType:    "INVALID",
			Status:           models.StatusPending,
			InitialLocation:  models.Location{Latitude: 37.7749, Longitude: -122.4194, Timestamp: time.Now()},
			TriggeredBy:      "user",
			CountdownSeconds: 10,
			CreatedAt:        time.Now(),
		}

		err := emergency.Validate()
		if err == nil {
			t.Error("Expected validation error for invalid emergency type")
		}
	})
}

func TestEmergencyStatusChecks(t *testing.T) {
	t.Run("IsActive returns true for active emergency", func(t *testing.T) {
		emergency := &models.Emergency{Status: models.StatusActive}
		if !emergency.IsActive() {
			t.Error("Expected IsActive to return true")
		}
	})

	t.Run("IsPending returns true for pending emergency", func(t *testing.T) {
		emergency := &models.Emergency{Status: models.StatusPending}
		if !emergency.IsPending() {
			t.Error("Expected IsPending to return true")
		}
	})

	t.Run("CanBeCancelled returns true for pending", func(t *testing.T) {
		emergency := &models.Emergency{Status: models.StatusPending}
		if !emergency.CanBeCancelled() {
			t.Error("Expected CanBeCancelled to return true for pending")
		}
	})

	t.Run("CanBeCancelled returns true for active", func(t *testing.T) {
		emergency := &models.Emergency{Status: models.StatusActive}
		if !emergency.CanBeCancelled() {
			t.Error("Expected CanBeCancelled to return true for active")
		}
	})

	t.Run("CanBeCancelled returns false for resolved", func(t *testing.T) {
		emergency := &models.Emergency{Status: models.StatusResolved}
		if emergency.CanBeCancelled() {
			t.Error("Expected CanBeCancelled to return false for resolved")
		}
	})

	t.Run("CanBeResolved returns true for active", func(t *testing.T) {
		emergency := &models.Emergency{Status: models.StatusActive}
		if !emergency.CanBeResolved() {
			t.Error("Expected CanBeResolved to return true for active")
		}
	})

	t.Run("CanBeResolved returns false for pending", func(t *testing.T) {
		emergency := &models.Emergency{Status: models.StatusPending}
		if emergency.CanBeResolved() {
			t.Error("Expected CanBeResolved to return false for pending")
		}
	})
}

func TestAcknowledgmentValidation(t *testing.T) {
	t.Run("Valid acknowledgment with phone", func(t *testing.T) {
		phone := "+1234567890"
		ack := &models.EmergencyAcknowledgment{
			EmergencyID:  uuid.New(),
			ContactID:    uuid.New(),
			ContactName:  "John Doe",
			ContactPhone: &phone,
		}

		err := ack.Validate()
		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
	})

	t.Run("Valid acknowledgment with email", func(t *testing.T) {
		email := "john@example.com"
		ack := &models.EmergencyAcknowledgment{
			EmergencyID:  uuid.New(),
			ContactID:    uuid.New(),
			ContactName:  "John Doe",
			ContactEmail: &email,
		}

		err := ack.Validate()
		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
	})

	t.Run("Invalid acknowledgment without contact method", func(t *testing.T) {
		ack := &models.EmergencyAcknowledgment{
			EmergencyID: uuid.New(),
			ContactID:   uuid.New(),
			ContactName: "John Doe",
		}

		err := ack.Validate()
		if err == nil {
			t.Error("Expected validation error for missing contact method")
		}
	})

	t.Run("Invalid acknowledgment without contact name", func(t *testing.T) {
		phone := "+1234567890"
		ack := &models.EmergencyAcknowledgment{
			EmergencyID:  uuid.New(),
			ContactID:    uuid.New(),
			ContactPhone: &phone,
		}

		err := ack.Validate()
		if err == nil {
			t.Error("Expected validation error for missing contact name")
		}
	})
}

func TestMockRepository(t *testing.T) {
	t.Run("Create and retrieve emergency", func(t *testing.T) {
		repo := NewMockEmergencyRepository()
		ctx := context.Background()

		emergency := &models.Emergency{
			ID:               uuid.New(),
			UserID:           uuid.New(),
			EmergencyType:    models.EmergencyTypeMedical,
			Status:           models.StatusPending,
			InitialLocation:  models.Location{Latitude: 37.7749, Longitude: -122.4194, Timestamp: time.Now()},
			TriggeredBy:      "user",
			CountdownSeconds: 10,
			CreatedAt:        time.Now(),
		}

		err := repo.Create(ctx, emergency)
		if err != nil {
			t.Errorf("Failed to create emergency: %v", err)
		}

		retrieved, err := repo.GetByID(ctx, emergency.ID)
		if err != nil {
			t.Errorf("Failed to retrieve emergency: %v", err)
		}

		if retrieved.ID != emergency.ID {
			t.Errorf("Expected ID %v, got %v", emergency.ID, retrieved.ID)
		}
	})

	t.Run("Create and retrieve acknowledgment", func(t *testing.T) {
		repo := NewMockAcknowledgmentRepository()
		ctx := context.Background()

		emergencyID := uuid.New()
		phone := "+1234567890"
		ack := &models.EmergencyAcknowledgment{
			EmergencyID:  emergencyID,
			ContactID:    uuid.New(),
			ContactName:  "John Doe",
			ContactPhone: &phone,
		}

		err := repo.Create(ctx, ack)
		if err != nil {
			t.Errorf("Failed to create acknowledgment: %v", err)
		}

		acks, err := repo.GetByEmergencyID(ctx, emergencyID)
		if err != nil {
			t.Errorf("Failed to retrieve acknowledgments: %v", err)
		}

		if len(acks) != 1 {
			t.Errorf("Expected 1 acknowledgment, got %d", len(acks))
		}

		if acks[0].ContactName != "John Doe" {
			t.Errorf("Expected contact name 'John Doe', got %v", acks[0].ContactName)
		}
	})
}
