package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/sos-app/location-service/internal/cache"
	"github.com/sos-app/location-service/internal/kafka"
	"github.com/sos-app/location-service/internal/models"
	"github.com/sos-app/location-service/internal/repository"
)

// LocationService handles business logic for location tracking
type LocationService struct {
	repo             *repository.LocationRepository
	cache            *cache.GeospatialCache
	kafkaProducer    *kafka.Producer
	geocodingService *GeocodingService
}

// NewLocationService creates a new location service
func NewLocationService(
	repo *repository.LocationRepository,
	cache *cache.GeospatialCache,
	kafkaProducer *kafka.Producer,
	geocodingService *GeocodingService,
) *LocationService {
	return &LocationService{
		repo:             repo,
		cache:            cache,
		kafkaProducer:    kafkaProducer,
		geocodingService: geocodingService,
	}
}

// UpdateLocation processes a location update
func (s *LocationService) UpdateLocation(ctx context.Context, update *models.LocationUpdate) error {
	// Validate the update
	if err := update.Validate(); err != nil {
		return fmt.Errorf("invalid location update: %w", err)
	}

	// Convert to LocationPoint
	location := update.ToLocationPoint()

	// Add to batch write buffer
	if err := s.repo.AddLocationToBatch(*location); err != nil {
		return fmt.Errorf("failed to add location to batch: %w", err)
	}

	// Update Redis cache for fast retrieval
	if err := s.cache.SetCurrentLocation(update.EmergencyID, location); err != nil {
		return fmt.Errorf("failed to update cache: %w", err)
	}

	// Publish to Kafka for real-time updates
	if err := s.kafkaProducer.PublishLocationUpdate(ctx, location); err != nil {
		// Log error but don't fail the update
		fmt.Printf("Failed to publish location update to Kafka: %v\n", err)
	}

	// Async reverse geocoding if address is not provided
	if location.Address == nil {
		go func() {
			address, err := s.geocodingService.ReverseGeocode(location.Latitude, location.Longitude)
			if err == nil && address != "" {
				location.Address = &address
				// Note: We would update the database here after the batch is written
			}
		}()
	}

	return nil
}

// BatchUpdateLocations handles batch updates from offline clients
func (s *LocationService) BatchUpdateLocations(ctx context.Context, batch *models.BatchLocationUpdate) error {
	if len(batch.Locations) == 0 {
		return fmt.Errorf("empty batch update")
	}

	// Validate all locations
	for _, update := range batch.Locations {
		if err := update.Validate(); err != nil {
			return fmt.Errorf("invalid location in batch: %w", err)
		}
	}

	// Convert to LocationPoints
	locations := make([]models.LocationPoint, len(batch.Locations))
	for i, update := range batch.Locations {
		locations[i] = *update.ToLocationPoint()
	}

	// Batch insert into database
	if err := s.repo.BatchInsertLocations(ctx, locations); err != nil {
		return fmt.Errorf("failed to batch insert locations: %w", err)
	}

	// Update cache with most recent location
	if len(locations) > 0 {
		latest := &locations[len(locations)-1]
		if err := s.cache.SetCurrentLocation(batch.EmergencyID, latest); err != nil {
			fmt.Printf("Failed to update cache after batch: %v\n", err)
		}

		// Publish latest location to Kafka
		if err := s.kafkaProducer.PublishLocationUpdate(ctx, latest); err != nil {
			fmt.Printf("Failed to publish batch location to Kafka: %v\n", err)
		}
	}

	return nil
}

// GetCurrentLocation retrieves the current location for an emergency
func (s *LocationService) GetCurrentLocation(ctx context.Context, emergencyID uuid.UUID) (*models.LocationPoint, error) {
	// Try cache first
	location, err := s.cache.GetCurrentLocation(emergencyID)
	if err != nil {
		fmt.Printf("Cache error, falling back to database: %v\n", err)
	}
	if location != nil {
		return location, nil
	}

	// Fallback to database
	location, err = s.repo.GetCurrentLocation(ctx, emergencyID)
	if err != nil {
		return nil, fmt.Errorf("failed to get current location: %w", err)
	}

	// Update cache for next request
	if location != nil {
		if err := s.cache.SetCurrentLocation(emergencyID, location); err != nil {
			fmt.Printf("Failed to update cache: %v\n", err)
		}
	}

	return location, nil
}

// GetLocationTrail retrieves recent location history
func (s *LocationService) GetLocationTrail(ctx context.Context, emergencyID uuid.UUID, duration time.Duration) ([]models.LocationPoint, error) {
	locations, err := s.repo.GetLocationTrail(ctx, emergencyID, duration)
	if err != nil {
		return nil, fmt.Errorf("failed to get location trail: %w", err)
	}
	return locations, nil
}

// GetLocationHistory retrieves full location history with pagination
func (s *LocationService) GetLocationHistory(ctx context.Context, emergencyID uuid.UUID, limit, offset int) ([]models.LocationPoint, int, error) {
	locations, total, err := s.repo.GetLocationHistory(ctx, emergencyID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get location history: %w", err)
	}
	return locations, total, nil
}

// SelectBestLocation chooses the best location from multiple providers
func (s *LocationService) SelectBestLocation(updates []models.LocationUpdate) *models.LocationUpdate {
	if len(updates) == 0 {
		return nil
	}

	if len(updates) == 1 {
		return &updates[0]
	}

	// Select based on provider priority and accuracy
	best := &updates[0]
	for i := range updates {
		current := &updates[i]

		// Higher priority provider
		if models.GetProviderPriority(current.Provider) > models.GetProviderPriority(best.Provider) {
			best = current
			continue
		}

		// Same provider, check accuracy
		if current.Provider == best.Provider {
			if current.Accuracy != nil && best.Accuracy != nil {
				if *current.Accuracy < *best.Accuracy {
					best = current
				}
			}
		}
	}

	return best
}

// StartTracking initializes tracking for an emergency
func (s *LocationService) StartTracking(ctx context.Context, emergencyID uuid.UUID) error {
	// This could set up any necessary tracking state
	// For now, it's a placeholder for future enhancements
	fmt.Printf("Started tracking for emergency: %s\n", emergencyID)
	return nil
}

// StopTracking ends tracking for an emergency
func (s *LocationService) StopTracking(ctx context.Context, emergencyID uuid.UUID) error {
	// Set cache expiration to 30 minutes from now
	location, err := s.cache.GetCurrentLocation(emergencyID)
	if err != nil {
		return fmt.Errorf("failed to get current location: %w", err)
	}

	if location != nil {
		if err := s.cache.SetWithTTL(emergencyID, location, 30*time.Minute); err != nil {
			return fmt.Errorf("failed to set expiration: %w", err)
		}
	}

	fmt.Printf("Stopped tracking for emergency: %s\n", emergencyID)
	return nil
}
