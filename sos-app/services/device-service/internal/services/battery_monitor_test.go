package services

import (
	"context"
	"testing"

	"github.com/rs/zerolog"
	"github.com/sos-app/device-service/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestBatteryMonitor_CheckAndNotify_At20Percent(t *testing.T) {
	// Setup
	logger := zerolog.Nop()
	monitor := NewBatteryMonitor(logger)

	device := &models.Device{
		ID:     "device-123",
		UserID: "user-123",
	}

	ctx := context.Background()

	// First notification at 20%
	err := monitor.CheckAndNotify(ctx, device, 20)
	assert.NoError(t, err)

	// Verify notification was tracked
	status := monitor.GetNotificationStatus(device.ID)
	assert.True(t, status[BatteryThreshold20])
	assert.False(t, status[BatteryThreshold10])
}

func TestBatteryMonitor_CheckAndNotify_At10Percent(t *testing.T) {
	// Setup
	logger := zerolog.Nop()
	monitor := NewBatteryMonitor(logger)

	device := &models.Device{
		ID:     "device-123",
		UserID: "user-123",
	}

	ctx := context.Background()

	// Notification at 10% (critical)
	err := monitor.CheckAndNotify(ctx, device, 10)
	assert.NoError(t, err)

	// Verify notification was tracked
	status := monitor.GetNotificationStatus(device.ID)
	assert.True(t, status[BatteryThreshold10])
}

func TestBatteryMonitor_NoNotification_Above20Percent(t *testing.T) {
	// Setup
	logger := zerolog.Nop()
	monitor := NewBatteryMonitor(logger)

	device := &models.Device{
		ID:     "device-123",
		UserID: "user-123",
	}

	ctx := context.Background()

	// No notification should be sent at 50%
	err := monitor.CheckAndNotify(ctx, device, 50)
	assert.NoError(t, err)

	// Verify no notifications were tracked
	status := monitor.GetNotificationStatus(device.ID)
	assert.False(t, status[BatteryThreshold20])
	assert.False(t, status[BatteryThreshold10])
}

func TestBatteryMonitor_ResetAfterCharging(t *testing.T) {
	// Setup
	logger := zerolog.Nop()
	monitor := NewBatteryMonitor(logger)

	device := &models.Device{
		ID:     "device-123",
		UserID: "user-123",
	}

	ctx := context.Background()

	// First, trigger notification at 20%
	err := monitor.CheckAndNotify(ctx, device, 20)
	assert.NoError(t, err)

	// Verify notification was tracked
	status := monitor.GetNotificationStatus(device.ID)
	assert.True(t, status[BatteryThreshold20])

	// Now battery is charged back to 80%
	err = monitor.CheckAndNotify(ctx, device, 80)
	assert.NoError(t, err)

	// Verify notifications were reset
	status = monitor.GetNotificationStatus(device.ID)
	assert.False(t, status[BatteryThreshold20])
	assert.False(t, status[BatteryThreshold10])

	// If battery drops to 20% again, should notify again
	err = monitor.CheckAndNotify(ctx, device, 20)
	assert.NoError(t, err)

	status = monitor.GetNotificationStatus(device.ID)
	assert.True(t, status[BatteryThreshold20])
}

func TestBatteryMonitor_NoDuplicateNotifications(t *testing.T) {
	// Setup
	logger := zerolog.Nop()
	monitor := NewBatteryMonitor(logger)

	device := &models.Device{
		ID:     "device-123",
		UserID: "user-123",
	}

	ctx := context.Background()

	// First notification at 20%
	err := monitor.CheckAndNotify(ctx, device, 20)
	assert.NoError(t, err)

	// Second check at 19% (still in 20% threshold range)
	// Should not trigger another notification
	err = monitor.CheckAndNotify(ctx, device, 19)
	assert.NoError(t, err)

	// Third check at 18%
	err = monitor.CheckAndNotify(ctx, device, 18)
	assert.NoError(t, err)

	// Only one notification should have been tracked
	status := monitor.GetNotificationStatus(device.ID)
	assert.True(t, status[BatteryThreshold20])
}

func TestBatteryMonitor_BothThresholds(t *testing.T) {
	// Setup
	logger := zerolog.Nop()
	monitor := NewBatteryMonitor(logger)

	device := &models.Device{
		ID:     "device-123",
		UserID: "user-123",
	}

	ctx := context.Background()

	// Trigger 20% notification
	err := monitor.CheckAndNotify(ctx, device, 20)
	assert.NoError(t, err)

	// Then trigger 10% notification
	err = monitor.CheckAndNotify(ctx, device, 10)
	assert.NoError(t, err)

	// Both should be tracked
	status := monitor.GetNotificationStatus(device.ID)
	assert.True(t, status[BatteryThreshold20])
	assert.True(t, status[BatteryThreshold10])
}

func TestBatteryMonitor_ResetDevice(t *testing.T) {
	// Setup
	logger := zerolog.Nop()
	monitor := NewBatteryMonitor(logger)

	device := &models.Device{
		ID:     "device-123",
		UserID: "user-123",
	}

	ctx := context.Background()

	// Trigger notification
	err := monitor.CheckAndNotify(ctx, device, 20)
	assert.NoError(t, err)

	// Explicitly reset
	monitor.ResetDevice(device.ID)

	// Verify reset
	status := monitor.GetNotificationStatus(device.ID)
	assert.False(t, status[BatteryThreshold20])
}
