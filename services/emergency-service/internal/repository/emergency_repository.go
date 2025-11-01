package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/sos-app/emergency-service/internal/models"
)

var (
	ErrEmergencyNotFound      = errors.New("emergency not found")
	ErrEmergencyAlreadyActive = errors.New("user already has an active emergency")
	ErrInvalidStatus          = errors.New("invalid status transition")
)

// EmergencyRepository handles database operations for emergencies
type EmergencyRepository struct {
	db *pgxpool.Pool
}

// NewEmergencyRepository creates a new EmergencyRepository
func NewEmergencyRepository(db *pgxpool.Pool) *EmergencyRepository {
	return &EmergencyRepository{db: db}
}

// Create creates a new emergency in the database
func (r *EmergencyRepository) Create(ctx context.Context, emergency *models.Emergency) error {
	query := `
		INSERT INTO emergencies (
			id, user_id, emergency_type, status, initial_location, initial_message,
			auto_triggered, triggered_by, countdown_seconds, created_at, metadata
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		)
	`

	_, err := r.db.Exec(ctx, query,
		emergency.ID,
		emergency.UserID,
		emergency.EmergencyType,
		emergency.Status,
		emergency.InitialLocation,
		emergency.InitialMessage,
		emergency.AutoTriggered,
		emergency.TriggeredBy,
		emergency.CountdownSeconds,
		emergency.CreatedAt,
		emergency.Metadata,
	)

	if err != nil {
		return fmt.Errorf("failed to create emergency: %w", err)
	}

	return nil
}

// GetByID retrieves an emergency by its ID
func (r *EmergencyRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Emergency, error) {
	query := `
		SELECT id, user_id, emergency_type, status, initial_location, initial_message,
		       auto_triggered, triggered_by, countdown_seconds, created_at, activated_at,
		       cancelled_at, resolved_at, resolution_notes, metadata
		FROM emergencies
		WHERE id = $1
	`

	var emergency models.Emergency
	err := r.db.QueryRow(ctx, query, id).Scan(
		&emergency.ID,
		&emergency.UserID,
		&emergency.EmergencyType,
		&emergency.Status,
		&emergency.InitialLocation,
		&emergency.InitialMessage,
		&emergency.AutoTriggered,
		&emergency.TriggeredBy,
		&emergency.CountdownSeconds,
		&emergency.CreatedAt,
		&emergency.ActivatedAt,
		&emergency.CancelledAt,
		&emergency.ResolvedAt,
		&emergency.ResolutionNotes,
		&emergency.Metadata,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrEmergencyNotFound
		}
		return nil, fmt.Errorf("failed to get emergency: %w", err)
	}

	return &emergency, nil
}

// GetByUserID retrieves all emergencies for a specific user
func (r *EmergencyRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]models.Emergency, error) {
	query := `
		SELECT id, user_id, emergency_type, status, initial_location, initial_message,
		       auto_triggered, triggered_by, countdown_seconds, created_at, activated_at,
		       cancelled_at, resolved_at, resolution_notes, metadata
		FROM emergencies
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get emergencies for user: %w", err)
	}
	defer rows.Close()

	var emergencies []models.Emergency
	for rows.Next() {
		var emergency models.Emergency
		err := rows.Scan(
			&emergency.ID,
			&emergency.UserID,
			&emergency.EmergencyType,
			&emergency.Status,
			&emergency.InitialLocation,
			&emergency.InitialMessage,
			&emergency.AutoTriggered,
			&emergency.TriggeredBy,
			&emergency.CountdownSeconds,
			&emergency.CreatedAt,
			&emergency.ActivatedAt,
			&emergency.CancelledAt,
			&emergency.ResolvedAt,
			&emergency.ResolutionNotes,
			&emergency.Metadata,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan emergency: %w", err)
		}
		emergencies = append(emergencies, emergency)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating emergencies: %w", err)
	}

	return emergencies, nil
}

// GetActiveByUserID checks if user has an active emergency
func (r *EmergencyRepository) GetActiveByUserID(ctx context.Context, userID uuid.UUID) (*models.Emergency, error) {
	query := `
		SELECT id, user_id, emergency_type, status, initial_location, initial_message,
		       auto_triggered, triggered_by, countdown_seconds, created_at, activated_at,
		       cancelled_at, resolved_at, resolution_notes, metadata
		FROM emergencies
		WHERE user_id = $1 AND status IN ('PENDING', 'ACTIVE')
		ORDER BY created_at DESC
		LIMIT 1
	`

	var emergency models.Emergency
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&emergency.ID,
		&emergency.UserID,
		&emergency.EmergencyType,
		&emergency.Status,
		&emergency.InitialLocation,
		&emergency.InitialMessage,
		&emergency.AutoTriggered,
		&emergency.TriggeredBy,
		&emergency.CountdownSeconds,
		&emergency.CreatedAt,
		&emergency.ActivatedAt,
		&emergency.CancelledAt,
		&emergency.ResolvedAt,
		&emergency.ResolutionNotes,
		&emergency.Metadata,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil // No active emergency
		}
		return nil, fmt.Errorf("failed to get active emergency: %w", err)
	}

	return &emergency, nil
}

// UpdateStatus updates the status of an emergency
func (r *EmergencyRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status models.EmergencyStatus) error {
	var query string
	var args []interface{}

	switch status {
	case models.StatusActive:
		query = `UPDATE emergencies SET status = $1, activated_at = $2 WHERE id = $3`
		args = []interface{}{status, time.Now(), id}
	case models.StatusCancelled:
		query = `UPDATE emergencies SET status = $1, cancelled_at = $2 WHERE id = $3`
		args = []interface{}{status, time.Now(), id}
	case models.StatusResolved:
		query = `UPDATE emergencies SET status = $1, resolved_at = $2 WHERE id = $3`
		args = []interface{}{status, time.Now(), id}
	default:
		return ErrInvalidStatus
	}

	result, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to update emergency status: %w", err)
	}

	if result.RowsAffected() == 0 {
		return ErrEmergencyNotFound
	}

	return nil
}

// Resolve updates an emergency to resolved status with notes
func (r *EmergencyRepository) Resolve(ctx context.Context, id uuid.UUID, notes string) error {
	query := `
		UPDATE emergencies
		SET status = $1, resolved_at = $2, resolution_notes = $3
		WHERE id = $4 AND status = 'ACTIVE'
	`

	result, err := r.db.Exec(ctx, query, models.StatusResolved, time.Now(), notes, id)
	if err != nil {
		return fmt.Errorf("failed to resolve emergency: %w", err)
	}

	if result.RowsAffected() == 0 {
		return ErrEmergencyNotFound
	}

	return nil
}

// Delete soft deletes an emergency (not used in production, for testing only)
func (r *EmergencyRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM emergencies WHERE id = $1`

	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete emergency: %w", err)
	}

	if result.RowsAffected() == 0 {
		return ErrEmergencyNotFound
	}

	return nil
}

// ListWithFilters retrieves emergencies with filtering and pagination
func (r *EmergencyRepository) ListWithFilters(ctx context.Context, filters models.HistoryFilters) ([]models.Emergency, int, error) {
	// Build query with filters
	query := `
		SELECT id, user_id, emergency_type, status, initial_location, initial_message,
		       auto_triggered, triggered_by, countdown_seconds, created_at, activated_at,
		       cancelled_at, resolved_at, resolution_notes, metadata
		FROM emergencies
		WHERE user_id = $1
	`

	args := []interface{}{filters.UserID}
	argPos := 2

	if filters.Status != nil {
		query += fmt.Sprintf(" AND status = $%d", argPos)
		args = append(args, *filters.Status)
		argPos++
	}

	if filters.Type != nil {
		query += fmt.Sprintf(" AND emergency_type = $%d", argPos)
		args = append(args, *filters.Type)
		argPos++
	}

	if filters.StartDate != nil {
		query += fmt.Sprintf(" AND created_at >= $%d", argPos)
		args = append(args, *filters.StartDate)
		argPos++
	}

	if filters.EndDate != nil {
		query += fmt.Sprintf(" AND created_at <= $%d", argPos)
		args = append(args, *filters.EndDate)
		argPos++
	}

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM (%s) AS filtered", query)
	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count emergencies: %w", err)
	}

	// Add ordering and pagination
	query += " ORDER BY created_at DESC"

	if filters.PageSize > 0 {
		query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argPos, argPos+1)
		args = append(args, filters.PageSize, (filters.Page-1)*filters.PageSize)
	}

	// Execute query
	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list emergencies: %w", err)
	}
	defer rows.Close()

	var emergencies []models.Emergency
	for rows.Next() {
		var emergency models.Emergency
		err := rows.Scan(
			&emergency.ID,
			&emergency.UserID,
			&emergency.EmergencyType,
			&emergency.Status,
			&emergency.InitialLocation,
			&emergency.InitialMessage,
			&emergency.AutoTriggered,
			&emergency.TriggeredBy,
			&emergency.CountdownSeconds,
			&emergency.CreatedAt,
			&emergency.ActivatedAt,
			&emergency.CancelledAt,
			&emergency.ResolvedAt,
			&emergency.ResolutionNotes,
			&emergency.Metadata,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan emergency: %w", err)
		}
		emergencies = append(emergencies, emergency)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating emergencies: %w", err)
	}

	return emergencies, total, nil
}
