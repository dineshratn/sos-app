package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/sos-app/device-service/internal/models"
)

// DeviceRepository handles device data persistence
type DeviceRepository struct {
	db *pgxpool.Pool
}

// NewDeviceRepository creates a new device repository
func NewDeviceRepository(db *pgxpool.Pool) *DeviceRepository {
	return &DeviceRepository{db: db}
}

// Create creates a new device
func (r *DeviceRepository) Create(ctx context.Context, device *models.Device) error {
	query := `
		INSERT INTO devices (id, user_id, device_type, manufacturer, model, mac_address,
			paired_at, battery_level, status, capabilities, settings)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING created_at, updated_at
	`

	err := r.db.QueryRow(ctx, query,
		device.ID,
		device.UserID,
		device.DeviceType,
		device.Manufacturer,
		device.Model,
		device.MacAddress,
		device.PairedAt,
		device.BatteryLevel,
		device.Status,
		device.Capabilities,
		device.Settings,
	).Scan(&device.CreatedAt, &device.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create device: %w", err)
	}

	return nil
}

// GetByID retrieves a device by ID
func (r *DeviceRepository) GetByID(ctx context.Context, id string) (*models.Device, error) {
	query := `
		SELECT id, user_id, device_type, manufacturer, model, mac_address, paired_at,
			battery_level, status, capabilities, settings, last_seen_at, created_at, updated_at
		FROM devices
		WHERE id = $1 AND status != 'DELETED'
	`

	device := &models.Device{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&device.ID,
		&device.UserID,
		&device.DeviceType,
		&device.Manufacturer,
		&device.Model,
		&device.MacAddress,
		&device.PairedAt,
		&device.BatteryLevel,
		&device.Status,
		&device.Capabilities,
		&device.Settings,
		&device.LastSeenAt,
		&device.CreatedAt,
		&device.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("device not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get device: %w", err)
	}

	return device, nil
}

// GetByMacAddress retrieves a device by MAC address
func (r *DeviceRepository) GetByMacAddress(ctx context.Context, macAddress string) (*models.Device, error) {
	query := `
		SELECT id, user_id, device_type, manufacturer, model, mac_address, paired_at,
			battery_level, status, capabilities, settings, last_seen_at, created_at, updated_at
		FROM devices
		WHERE mac_address = $1 AND status != 'DELETED'
	`

	device := &models.Device{}
	err := r.db.QueryRow(ctx, query, macAddress).Scan(
		&device.ID,
		&device.UserID,
		&device.DeviceType,
		&device.Manufacturer,
		&device.Model,
		&device.MacAddress,
		&device.PairedAt,
		&device.BatteryLevel,
		&device.Status,
		&device.Capabilities,
		&device.Settings,
		&device.LastSeenAt,
		&device.CreatedAt,
		&device.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("device not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get device: %w", err)
	}

	return device, nil
}

// GetByUserID retrieves all devices for a user
func (r *DeviceRepository) GetByUserID(ctx context.Context, userID string) ([]*models.Device, error) {
	query := `
		SELECT id, user_id, device_type, manufacturer, model, mac_address, paired_at,
			battery_level, status, capabilities, settings, last_seen_at, created_at, updated_at
		FROM devices
		WHERE user_id = $1 AND status != 'DELETED'
		ORDER BY paired_at DESC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get devices: %w", err)
	}
	defer rows.Close()

	var devices []*models.Device
	for rows.Next() {
		device := &models.Device{}
		err := rows.Scan(
			&device.ID,
			&device.UserID,
			&device.DeviceType,
			&device.Manufacturer,
			&device.Model,
			&device.MacAddress,
			&device.PairedAt,
			&device.BatteryLevel,
			&device.Status,
			&device.Capabilities,
			&device.Settings,
			&device.LastSeenAt,
			&device.CreatedAt,
			&device.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan device: %w", err)
		}
		devices = append(devices, device)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating devices: %w", err)
	}

	return devices, nil
}

// Update updates a device
func (r *DeviceRepository) Update(ctx context.Context, device *models.Device) error {
	query := `
		UPDATE devices
		SET device_type = $2, manufacturer = $3, model = $4, battery_level = $5,
			status = $6, capabilities = $7, settings = $8, last_seen_at = $9
		WHERE id = $1 AND status != 'DELETED'
	`

	result, err := r.db.Exec(ctx, query,
		device.ID,
		device.DeviceType,
		device.Manufacturer,
		device.Model,
		device.BatteryLevel,
		device.Status,
		device.Capabilities,
		device.Settings,
		device.LastSeenAt,
	)

	if err != nil {
		return fmt.Errorf("failed to update device: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("device not found")
	}

	return nil
}

// UpdateBatteryLevel updates the battery level of a device
func (r *DeviceRepository) UpdateBatteryLevel(ctx context.Context, deviceID string, batteryLevel int) error {
	query := `
		UPDATE devices
		SET battery_level = $2, last_seen_at = $3
		WHERE id = $1 AND status != 'DELETED'
	`

	result, err := r.db.Exec(ctx, query, deviceID, batteryLevel, time.Now())
	if err != nil {
		return fmt.Errorf("failed to update battery level: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("device not found")
	}

	return nil
}

// UpdateStatus updates the status of a device
func (r *DeviceRepository) UpdateStatus(ctx context.Context, deviceID string, status models.DeviceStatus) error {
	query := `
		UPDATE devices
		SET status = $2
		WHERE id = $1
	`

	result, err := r.db.Exec(ctx, query, deviceID, status)
	if err != nil {
		return fmt.Errorf("failed to update status: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("device not found")
	}

	return nil
}

// UpdateSettings updates device settings
func (r *DeviceRepository) UpdateSettings(ctx context.Context, deviceID string, settings map[string]interface{}) error {
	query := `
		UPDATE devices
		SET settings = $2
		WHERE id = $1 AND status != 'DELETED'
	`

	result, err := r.db.Exec(ctx, query, deviceID, settings)
	if err != nil {
		return fmt.Errorf("failed to update settings: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("device not found")
	}

	return nil
}

// UpdateLastSeen updates the last seen timestamp
func (r *DeviceRepository) UpdateLastSeen(ctx context.Context, deviceID string) error {
	query := `
		UPDATE devices
		SET last_seen_at = $2
		WHERE id = $1 AND status != 'DELETED'
	`

	result, err := r.db.Exec(ctx, query, deviceID, time.Now())
	if err != nil {
		return fmt.Errorf("failed to update last seen: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("device not found")
	}

	return nil
}

// SoftDelete soft deletes a device by setting status to DELETED
func (r *DeviceRepository) SoftDelete(ctx context.Context, id string) error {
	query := `
		UPDATE devices
		SET status = 'DELETED'
		WHERE id = $1
	`

	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete device: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("device not found")
	}

	return nil
}

// GetDisconnectedDevices retrieves devices that haven't sent telemetry for a given duration
func (r *DeviceRepository) GetDisconnectedDevices(ctx context.Context, duration time.Duration) ([]*models.Device, error) {
	query := `
		SELECT id, user_id, device_type, manufacturer, model, mac_address, paired_at,
			battery_level, status, capabilities, settings, last_seen_at, created_at, updated_at
		FROM devices
		WHERE status = 'ACTIVE'
			AND last_seen_at IS NOT NULL
			AND last_seen_at < $1
	`

	threshold := time.Now().Add(-duration)
	rows, err := r.db.Query(ctx, query, threshold)
	if err != nil {
		return nil, fmt.Errorf("failed to get disconnected devices: %w", err)
	}
	defer rows.Close()

	var devices []*models.Device
	for rows.Next() {
		device := &models.Device{}
		err := rows.Scan(
			&device.ID,
			&device.UserID,
			&device.DeviceType,
			&device.Manufacturer,
			&device.Model,
			&device.MacAddress,
			&device.PairedAt,
			&device.BatteryLevel,
			&device.Status,
			&device.Capabilities,
			&device.Settings,
			&device.LastSeenAt,
			&device.CreatedAt,
			&device.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan device: %w", err)
		}
		devices = append(devices, device)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating devices: %w", err)
	}

	return devices, nil
}
