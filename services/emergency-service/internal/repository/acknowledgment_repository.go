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
	ErrAcknowledgmentNotFound      = errors.New("acknowledgment not found")
	ErrDuplicateAcknowledgment     = errors.New("contact already acknowledged this emergency")
)

// AcknowledgmentRepository handles database operations for acknowledgments
type AcknowledgmentRepository struct {
	db *pgxpool.Pool
}

// NewAcknowledgmentRepository creates a new AcknowledgmentRepository
func NewAcknowledgmentRepository(db *pgxpool.Pool) *AcknowledgmentRepository {
	return &AcknowledgmentRepository{db: db}
}

// Create creates a new acknowledgment in the database
func (r *AcknowledgmentRepository) Create(ctx context.Context, ack *models.EmergencyAcknowledgment) error {
	query := `
		INSERT INTO emergency_acknowledgments (
			id, emergency_id, contact_id, contact_name, contact_phone, contact_email,
			acknowledged_at, location, message
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9
		)
	`

	ack.ID = uuid.New()
	ack.AcknowledgedAt = time.Now()

	_, err := r.db.Exec(ctx, query,
		ack.ID,
		ack.EmergencyID,
		ack.ContactID,
		ack.ContactName,
		ack.ContactPhone,
		ack.ContactEmail,
		ack.AcknowledgedAt,
		ack.Location,
		ack.Message,
	)

	if err != nil {
		// Check for unique constraint violation
		if err.Error() == "duplicate key value violates unique constraint \"unique_acknowledgment\"" {
			return ErrDuplicateAcknowledgment
		}
		return fmt.Errorf("failed to create acknowledgment: %w", err)
	}

	return nil
}

// GetByID retrieves an acknowledgment by its ID
func (r *AcknowledgmentRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.EmergencyAcknowledgment, error) {
	query := `
		SELECT id, emergency_id, contact_id, contact_name, contact_phone, contact_email,
		       acknowledged_at, location, message
		FROM emergency_acknowledgments
		WHERE id = $1
	`

	var ack models.EmergencyAcknowledgment
	err := r.db.QueryRow(ctx, query, id).Scan(
		&ack.ID,
		&ack.EmergencyID,
		&ack.ContactID,
		&ack.ContactName,
		&ack.ContactPhone,
		&ack.ContactEmail,
		&ack.AcknowledgedAt,
		&ack.Location,
		&ack.Message,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAcknowledgmentNotFound
		}
		return nil, fmt.Errorf("failed to get acknowledgment: %w", err)
	}

	return &ack, nil
}

// GetByEmergencyID retrieves all acknowledgments for an emergency
func (r *AcknowledgmentRepository) GetByEmergencyID(ctx context.Context, emergencyID uuid.UUID) ([]models.EmergencyAcknowledgment, error) {
	query := `
		SELECT id, emergency_id, contact_id, contact_name, contact_phone, contact_email,
		       acknowledged_at, location, message
		FROM emergency_acknowledgments
		WHERE emergency_id = $1
		ORDER BY acknowledged_at ASC
	`

	rows, err := r.db.Query(ctx, query, emergencyID)
	if err != nil {
		return nil, fmt.Errorf("failed to get acknowledgments: %w", err)
	}
	defer rows.Close()

	var acknowledgments []models.EmergencyAcknowledgment
	for rows.Next() {
		var ack models.EmergencyAcknowledgment
		err := rows.Scan(
			&ack.ID,
			&ack.EmergencyID,
			&ack.ContactID,
			&ack.ContactName,
			&ack.ContactPhone,
			&ack.ContactEmail,
			&ack.AcknowledgedAt,
			&ack.Location,
			&ack.Message,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan acknowledgment: %w", err)
		}
		acknowledgments = append(acknowledgments, ack)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating acknowledgments: %w", err)
	}

	return acknowledgments, nil
}

// HasContactAcknowledged checks if a specific contact has acknowledged an emergency
func (r *AcknowledgmentRepository) HasContactAcknowledged(ctx context.Context, emergencyID, contactID uuid.UUID) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM emergency_acknowledgments
			WHERE emergency_id = $1 AND contact_id = $2
		)
	`

	var exists bool
	err := r.db.QueryRow(ctx, query, emergencyID, contactID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check acknowledgment: %w", err)
	}

	return exists, nil
}

// CountAcknowledgments returns the number of acknowledgments for an emergency
func (r *AcknowledgmentRepository) CountAcknowledgments(ctx context.Context, emergencyID uuid.UUID) (int, error) {
	query := `SELECT COUNT(*) FROM emergency_acknowledgments WHERE emergency_id = $1`

	var count int
	err := r.db.QueryRow(ctx, query, emergencyID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count acknowledgments: %w", err)
	}

	return count, nil
}

// Delete deletes an acknowledgment (for testing only)
func (r *AcknowledgmentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM emergency_acknowledgments WHERE id = $1`

	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete acknowledgment: %w", err)
	}

	if result.RowsAffected() == 0 {
		return ErrAcknowledgmentNotFound
	}

	return nil
}
