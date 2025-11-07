package services

import (
	"context"
	"fmt"
	"sync"

	"github.com/rs/zerolog"
	"github.com/sos-app/device-service/internal/models"
)

// BatteryThreshold represents different battery level thresholds
type BatteryThreshold int

const (
	BatteryThreshold20 BatteryThreshold = 20
	BatteryThreshold10 BatteryThreshold = 10
)

// BatteryMonitor monitors battery levels and sends notifications
type BatteryMonitor struct {
	// Track which devices have already been notified at each threshold
	// to avoid sending duplicate notifications
	notifiedDevices map[string]map[BatteryThreshold]bool
	mu              sync.RWMutex
	logger          zerolog.Logger
}

// NewBatteryMonitor creates a new battery monitor
func NewBatteryMonitor(logger zerolog.Logger) *BatteryMonitor {
	return &BatteryMonitor{
		notifiedDevices: make(map[string]map[BatteryThreshold]bool),
		logger:          logger,
	}
}

// CheckAndNotify checks battery level and sends notification if needed
func (m *BatteryMonitor) CheckAndNotify(ctx context.Context, device *models.Device, batteryLevel int) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Initialize device tracking if not exists
	if m.notifiedDevices[device.ID] == nil {
		m.notifiedDevices[device.ID] = make(map[BatteryThreshold]bool)
	}

	// Determine which threshold is crossed
	var threshold BatteryThreshold
	var shouldNotify bool

	if batteryLevel <= 10 {
		threshold = BatteryThreshold10
		// Always notify at 10% (critical level)
		if !m.notifiedDevices[device.ID][threshold] {
			shouldNotify = true
		}
	} else if batteryLevel <= 20 {
		threshold = BatteryThreshold20
		// Notify at 20% (warning level)
		if !m.notifiedDevices[device.ID][threshold] {
			shouldNotify = true
		}
	} else {
		// Battery level is above thresholds, reset notifications
		m.resetNotifications(device.ID)
		return nil
	}

	if shouldNotify {
		if err := m.sendLowBatteryNotification(ctx, device, batteryLevel, threshold); err != nil {
			return err
		}
		// Mark as notified
		m.notifiedDevices[device.ID][threshold] = true
	}

	return nil
}

// sendLowBatteryNotification sends a notification for low battery
func (m *BatteryMonitor) sendLowBatteryNotification(
	ctx context.Context,
	device *models.Device,
	batteryLevel int,
	threshold BatteryThreshold,
) error {
	priority := "MEDIUM"
	message := fmt.Sprintf("Device battery is low (%d%%)", batteryLevel)

	if threshold == BatteryThreshold10 {
		priority = "HIGH"
		message = fmt.Sprintf("CRITICAL: Device battery is critically low (%d%%)", batteryLevel)
		m.logger.Warn().
			Str("device_id", device.ID).
			Str("user_id", device.UserID).
			Int("battery_level", batteryLevel).
			Msg("Critical battery level - device may shut down soon")
	} else {
		m.logger.Info().
			Str("device_id", device.ID).
			Str("user_id", device.UserID).
			Int("battery_level", batteryLevel).
			Msg("Low battery warning")
	}

	// In a real implementation, this would call a notification service
	// For now, we just log the notification
	m.logger.Info().
		Str("device_id", device.ID).
		Str("user_id", device.UserID).
		Str("device_type", string(device.DeviceType)).
		Int("battery_level", batteryLevel).
		Int("threshold", int(threshold)).
		Str("priority", priority).
		Str("message", message).
		Msg("Low battery notification should be sent")

	// TODO: Integrate with notification service
	// Example:
	// notificationPayload := map[string]interface{}{
	//     "user_id": device.UserID,
	//     "type": "LOW_BATTERY",
	//     "priority": priority,
	//     "message": message,
	//     "device": map[string]interface{}{
	//         "id": device.ID,
	//         "type": device.DeviceType,
	//         "manufacturer": device.Manufacturer,
	//         "model": device.Model,
	//         "battery_level": batteryLevel,
	//     },
	// }
	// Send to notification service...

	return nil
}

// resetNotifications resets notification tracking for a device
// Called when battery level goes back above thresholds (e.g., device is charging)
func (m *BatteryMonitor) resetNotifications(deviceID string) {
	if m.notifiedDevices[deviceID] != nil {
		m.logger.Info().
			Str("device_id", deviceID).
			Msg("Battery level restored, resetting notification tracking")
		m.notifiedDevices[deviceID] = make(map[BatteryThreshold]bool)
	}
}

// ResetDevice explicitly resets notification tracking for a specific device
func (m *BatteryMonitor) ResetDevice(deviceID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.resetNotifications(deviceID)
}

// GetNotificationStatus returns whether a device has been notified at specific thresholds
func (m *BatteryMonitor) GetNotificationStatus(deviceID string) map[BatteryThreshold]bool {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.notifiedDevices[deviceID] == nil {
		return make(map[BatteryThreshold]bool)
	}

	// Return a copy to avoid race conditions
	status := make(map[BatteryThreshold]bool)
	for k, v := range m.notifiedDevices[deviceID] {
		status[k] = v
	}
	return status
}

// MonitorBatteryLevel is a convenience method that checks battery and logs status
func (m *BatteryMonitor) MonitorBatteryLevel(ctx context.Context, device *models.Device) error {
	if device.BatteryLevel <= 0 {
		m.logger.Debug().
			Str("device_id", device.ID).
			Msg("No battery level data available")
		return nil
	}

	return m.CheckAndNotify(ctx, device, device.BatteryLevel)
}
