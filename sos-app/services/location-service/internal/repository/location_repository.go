package repository

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/sos-app/location-service/internal/models"
)

// LocationRepository handles location data persistence
type LocationRepository struct {
	db           *Database
	batchBuffer  []models.LocationPoint
	bufferMutex  sync.Mutex
	batchSize    int
	flushTicker  *time.Ticker
	stopChan     chan bool
	wg           sync.WaitGroup
}

// NewLocationRepository creates a new location repository with batch writing
func NewLocationRepository(db *Database) *LocationRepository {
	repo := &LocationRepository{
		db:           db,
		batchBuffer:  make([]models.LocationPoint, 0, 1000),
		batchSize:    100,
		flushTicker:  time.NewTicker(500 * time.Millisecond),
		stopChan:     make(chan bool),
	}

	// Start background batch flusher
	repo.wg.Add(1)
	go repo.batchFlusher()

	return repo
}

// batchFlusher periodically flushes the batch buffer
func (r *LocationRepository) batchFlusher() {
	defer r.wg.Done()

	for {
		select {
		case <-r.flushTicker.C:
			if err := r.FlushBatch(context.Background()); err != nil {
				fmt.Printf("Error flushing batch: %v\n", err)
			}
		case <-r.stopChan:
			// Final flush on shutdown
			if err := r.FlushBatch(context.Background()); err != nil {
				fmt.Printf("Error in final flush: %v\n", err)
			}
			return
		}
	}
}

// Close stops the batch flusher and flushes remaining data
func (r *LocationRepository) Close() error {
	close(r.stopChan)
	r.flushTicker.Stop()
	r.wg.Wait()
	return nil
}

// AddLocationToBatch adds a location point to the batch buffer
func (r *LocationRepository) AddLocationToBatch(location models.LocationPoint) error {
	r.bufferMutex.Lock()
	defer r.bufferMutex.Unlock()

	r.batchBuffer = append(r.batchBuffer, location)

	// Flush if batch size is reached
	if len(r.batchBuffer) >= r.batchSize {
		go func() {
			if err := r.FlushBatch(context.Background()); err != nil {
				fmt.Printf("Error flushing full batch: %v\n", err)
			}
		}()
	}

	return nil
}

// FlushBatch writes all buffered location points to the database
func (r *LocationRepository) FlushBatch(ctx context.Context) error {
	r.bufferMutex.Lock()
	defer r.bufferMutex.Unlock()

	if len(r.batchBuffer) == 0 {
		return nil
	}

	// Copy buffer and clear
	batch := make([]models.LocationPoint, len(r.batchBuffer))
	copy(batch, r.batchBuffer)
	r.batchBuffer = r.batchBuffer[:0]

	// Use CopyFrom for bulk insert (fastest method for TimescaleDB)
	rows := make([][]interface{}, len(batch))
	for i, location := range batch {
		rows[i] = []interface{}{
			location.EmergencyID,
			location.UserID,
			location.Latitude,
			location.Longitude,
			location.Accuracy,
			location.Altitude,
			location.Speed,
			location.Heading,
			location.Provider,
			location.Address,
			location.Timestamp,
			location.BatteryLevel,
		}
	}

	columns := []string{
		"emergency_id", "user_id", "latitude", "longitude",
		"accuracy", "altitude", "speed", "heading",
		"provider", "address", "timestamp", "battery_level",
	}

	copyCount, err := r.db.Pool.CopyFrom(
		ctx,
		pgx.Identifier{"location_points"},
		columns,
		pgx.CopyFromRows(rows),
	)

	if err != nil {
		return fmt.Errorf("failed to bulk insert locations: %w", err)
	}

	fmt.Printf("Successfully inserted %d location points\n", copyCount)
	return nil
}

// InsertLocation inserts a single location point immediately (bypassing batch)
func (r *LocationRepository) InsertLocation(ctx context.Context, location models.LocationPoint) (int64, error) {
	query := `
		INSERT INTO location_points (
			emergency_id, user_id, latitude, longitude, accuracy,
			altitude, speed, heading, provider, address, timestamp, battery_level
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id
	`

	var id int64
	err := r.db.Pool.QueryRow(ctx, query,
		location.EmergencyID,
		location.UserID,
		location.Latitude,
		location.Longitude,
		location.Accuracy,
		location.Altitude,
		location.Speed,
		location.Heading,
		location.Provider,
		location.Address,
		location.Timestamp,
		location.BatteryLevel,
	).Scan(&id)

	if err != nil {
		return 0, fmt.Errorf("failed to insert location: %w", err)
	}

	return id, nil
}

// GetCurrentLocation retrieves the most recent location for an emergency
func (r *LocationRepository) GetCurrentLocation(ctx context.Context, emergencyID uuid.UUID) (*models.LocationPoint, error) {
	query := `
		SELECT id, emergency_id, user_id, latitude, longitude, accuracy,
		       altitude, speed, heading, provider, address, timestamp, battery_level
		FROM location_points
		WHERE emergency_id = $1
		ORDER BY timestamp DESC
		LIMIT 1
	`

	var location models.LocationPoint
	err := r.db.Pool.QueryRow(ctx, query, emergencyID).Scan(
		&location.ID,
		&location.EmergencyID,
		&location.UserID,
		&location.Latitude,
		&location.Longitude,
		&location.Accuracy,
		&location.Altitude,
		&location.Speed,
		&location.Heading,
		&location.Provider,
		&location.Address,
		&location.Timestamp,
		&location.BatteryLevel,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get current location: %w", err)
	}

	return &location, nil
}

// GetLocationTrail retrieves location points for the specified time duration
func (r *LocationRepository) GetLocationTrail(ctx context.Context, emergencyID uuid.UUID, duration time.Duration) ([]models.LocationPoint, error) {
	query := `
		SELECT id, emergency_id, user_id, latitude, longitude, accuracy,
		       altitude, speed, heading, provider, address, timestamp, battery_level
		FROM location_points
		WHERE emergency_id = $1 AND timestamp >= NOW() - $2::interval
		ORDER BY timestamp ASC
	`

	rows, err := r.db.Pool.Query(ctx, query, emergencyID, duration)
	if err != nil {
		return nil, fmt.Errorf("failed to get location trail: %w", err)
	}
	defer rows.Close()

	var locations []models.LocationPoint
	for rows.Next() {
		var location models.LocationPoint
		err := rows.Scan(
			&location.ID,
			&location.EmergencyID,
			&location.UserID,
			&location.Latitude,
			&location.Longitude,
			&location.Accuracy,
			&location.Altitude,
			&location.Speed,
			&location.Heading,
			&location.Provider,
			&location.Address,
			&location.Timestamp,
			&location.BatteryLevel,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan location: %w", err)
		}
		locations = append(locations, location)
	}

	return locations, rows.Err()
}

// GetLocationHistory retrieves all location points for an emergency with pagination
func (r *LocationRepository) GetLocationHistory(ctx context.Context, emergencyID uuid.UUID, limit, offset int) ([]models.LocationPoint, int, error) {
	// Get total count
	var total int
	countQuery := `SELECT COUNT(*) FROM location_points WHERE emergency_id = $1`
	err := r.db.Pool.QueryRow(ctx, countQuery, emergencyID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count locations: %w", err)
	}

	// Get paginated results
	query := `
		SELECT id, emergency_id, user_id, latitude, longitude, accuracy,
		       altitude, speed, heading, provider, address, timestamp, battery_level
		FROM location_points
		WHERE emergency_id = $1
		ORDER BY timestamp DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Pool.Query(ctx, query, emergencyID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get location history: %w", err)
	}
	defer rows.Close()

	var locations []models.LocationPoint
	for rows.Next() {
		var location models.LocationPoint
		err := rows.Scan(
			&location.ID,
			&location.EmergencyID,
			&location.UserID,
			&location.Latitude,
			&location.Longitude,
			&location.Accuracy,
			&location.Altitude,
			&location.Speed,
			&location.Heading,
			&location.Provider,
			&location.Address,
			&location.Timestamp,
			&location.BatteryLevel,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan location: %w", err)
		}
		locations = append(locations, location)
	}

	return locations, total, rows.Err()
}

// BatchInsertLocations inserts multiple location points at once
func (r *LocationRepository) BatchInsertLocations(ctx context.Context, locations []models.LocationPoint) error {
	if len(locations) == 0 {
		return nil
	}

	rows := make([][]interface{}, len(locations))
	for i, location := range locations {
		rows[i] = []interface{}{
			location.EmergencyID,
			location.UserID,
			location.Latitude,
			location.Longitude,
			location.Accuracy,
			location.Altitude,
			location.Speed,
			location.Heading,
			location.Provider,
			location.Address,
			location.Timestamp,
			location.BatteryLevel,
		}
	}

	columns := []string{
		"emergency_id", "user_id", "latitude", "longitude",
		"accuracy", "altitude", "speed", "heading",
		"provider", "address", "timestamp", "battery_level",
	}

	copyCount, err := r.db.Pool.CopyFrom(
		ctx,
		pgx.Identifier{"location_points"},
		columns,
		pgx.CopyFromRows(rows),
	)

	if err != nil {
		return fmt.Errorf("failed to batch insert locations: %w", err)
	}

	fmt.Printf("Successfully batch inserted %d location points\n", copyCount)
	return nil
}

// UpdateLocationAddress updates the address field for a location point
func (r *LocationRepository) UpdateLocationAddress(ctx context.Context, id int64, address string) error {
	query := `UPDATE location_points SET address = $1 WHERE id = $2`
	_, err := r.db.Pool.Exec(ctx, query, address, id)
	if err != nil {
		return fmt.Errorf("failed to update location address: %w", err)
	}
	return nil
}
