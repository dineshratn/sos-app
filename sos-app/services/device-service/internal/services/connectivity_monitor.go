package services

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/rs/zerolog"
	"github.com/sos-app/device-service/internal/models"
	"github.com/sos-app/device-service/internal/repository"
)

// ConnectivityMonitor monitors device connectivity status
type ConnectivityMonitor struct {
	deviceRepo          *repository.DeviceRepository
	disconnectThreshold time.Duration
	checkInterval       time.Duration
	notifiedDevices     map[string]bool
	mu                  sync.RWMutex
	logger              zerolog.Logger
	stopChan            chan struct{}
	wg                  sync.WaitGroup
}

// NewConnectivityMonitor creates a new connectivity monitor
func NewConnectivityMonitor(
	deviceRepo *repository.DeviceRepository,
	logger zerolog.Logger,
) *ConnectivityMonitor {
	return &ConnectivityMonitor{
		deviceRepo:          deviceRepo,
		disconnectThreshold: 5 * time.Minute, // Mark as disconnected if no telemetry for 5 minutes
		checkInterval:       1 * time.Minute,  // Check every minute
		notifiedDevices:     make(map[string]bool),
		logger:              logger,
		stopChan:            make(chan struct{}),
	}
}

// Start begins monitoring device connectivity
func (m *ConnectivityMonitor) Start(ctx context.Context) {
	m.logger.Info().
		Dur("threshold", m.disconnectThreshold).
		Dur("check_interval", m.checkInterval).
		Msg("Starting connectivity monitor")

	m.wg.Add(1)
	go m.monitorLoop(ctx)
}

// Stop stops the connectivity monitor
func (m *ConnectivityMonitor) Stop() {
	m.logger.Info().Msg("Stopping connectivity monitor")
	close(m.stopChan)
	m.wg.Wait()
	m.logger.Info().Msg("Connectivity monitor stopped")
}

// monitorLoop runs the monitoring loop
func (m *ConnectivityMonitor) monitorLoop(ctx context.Context) {
	defer m.wg.Done()

	ticker := time.NewTicker(m.checkInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if err := m.checkDisconnectedDevices(ctx); err != nil {
				m.logger.Error().
					Err(err).
					Msg("Error checking disconnected devices")
			}
		case <-m.stopChan:
			return
		case <-ctx.Done():
			return
		}
	}
}

// checkDisconnectedDevices checks for devices that haven't sent telemetry recently
func (m *ConnectivityMonitor) checkDisconnectedDevices(ctx context.Context) error {
	m.logger.Debug().Msg("Checking for disconnected devices")

	// Get devices that haven't sent telemetry for the threshold duration
	devices, err := m.deviceRepo.GetDisconnectedDevices(ctx, m.disconnectThreshold)
	if err != nil {
		return fmt.Errorf("failed to get disconnected devices: %w", err)
	}

	if len(devices) == 0 {
		m.logger.Debug().Msg("No disconnected devices found")
		return nil
	}

	m.logger.Info().
		Int("count", len(devices)).
		Msg("Found disconnected devices")

	// Process each disconnected device
	for _, device := range devices {
		if err := m.handleDisconnectedDevice(ctx, device); err != nil {
			m.logger.Error().
				Err(err).
				Str("device_id", device.ID).
				Msg("Failed to handle disconnected device")
		}
	}

	return nil
}

// handleDisconnectedDevice handles a disconnected device
func (m *ConnectivityMonitor) handleDisconnectedDevice(ctx context.Context, device *models.Device) error {
	m.logger.Warn().
		Str("device_id", device.ID).
		Str("user_id", device.UserID).
		Time("last_seen", *device.LastSeenAt).
		Msg("Device disconnected")

	// Update device status to DISCONNECTED
	if err := m.deviceRepo.UpdateStatus(ctx, device.ID, models.DeviceStatusDisconnected); err != nil {
		return fmt.Errorf("failed to update device status: %w", err)
	}

	// Send notification if not already notified
	m.mu.Lock()
	alreadyNotified := m.notifiedDevices[device.ID]
	m.mu.Unlock()

	if !alreadyNotified {
		if err := m.sendDisconnectionNotification(ctx, device); err != nil {
			return err
		}

		// Mark as notified
		m.mu.Lock()
		m.notifiedDevices[device.ID] = true
		m.mu.Unlock()
	}

	return nil
}

// sendDisconnectionNotification sends a notification about device disconnection
func (m *ConnectivityMonitor) sendDisconnectionNotification(ctx context.Context, device *models.Device) error {
	var lastSeenStr string
	if device.LastSeenAt != nil {
		duration := time.Since(*device.LastSeenAt)
		lastSeenStr = fmt.Sprintf("%.0f minutes ago", duration.Minutes())
	} else {
		lastSeenStr = "unknown"
	}

	m.logger.Warn().
		Str("device_id", device.ID).
		Str("user_id", device.UserID).
		Str("device_type", string(device.DeviceType)).
		Str("manufacturer", device.Manufacturer).
		Str("model", device.Model).
		Str("last_seen", lastSeenStr).
		Msgf("Device %s (%s) has disconnected. Last seen: %s",
			device.Model, device.DeviceType, lastSeenStr)

	// In a real implementation, this would call a notification service
	// For now, we just log the notification

	// TODO: Integrate with notification service
	// Example:
	// notificationPayload := map[string]interface{}{
	//     "user_id": device.UserID,
	//     "type": "DEVICE_DISCONNECTED",
	//     "priority": "MEDIUM",
	//     "message": message,
	//     "device": map[string]interface{}{
	//         "id": device.ID,
	//         "type": device.DeviceType,
	//         "manufacturer": device.Manufacturer,
	//         "model": device.Model,
	//         "last_seen_at": device.LastSeenAt,
	//     },
	// }
	// Send to notification service...

	return nil
}

// MarkDeviceReconnected marks a device as reconnected and clears notification flag
func (m *ConnectivityMonitor) MarkDeviceReconnected(deviceID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.notifiedDevices[deviceID] {
		m.logger.Info().
			Str("device_id", deviceID).
			Msg("Device reconnected, clearing notification flag")
		delete(m.notifiedDevices, deviceID)
	}
}

// CheckDeviceConnectivity manually checks a specific device's connectivity
func (m *ConnectivityMonitor) CheckDeviceConnectivity(ctx context.Context, deviceID string) error {
	device, err := m.deviceRepo.GetByID(ctx, deviceID)
	if err != nil {
		return fmt.Errorf("failed to get device: %w", err)
	}

	if device.LastSeenAt == nil {
		m.logger.Info().
			Str("device_id", deviceID).
			Msg("Device has never sent telemetry")
		return nil
	}

	timeSinceLastSeen := time.Since(*device.LastSeenAt)

	if timeSinceLastSeen > m.disconnectThreshold {
		m.logger.Warn().
			Str("device_id", deviceID).
			Dur("time_since_last_seen", timeSinceLastSeen).
			Msg("Device is disconnected")

		if device.Status == models.DeviceStatusActive {
			return m.handleDisconnectedDevice(ctx, device)
		}
	} else {
		m.logger.Info().
			Str("device_id", deviceID).
			Dur("time_since_last_seen", timeSinceLastSeen).
			Msg("Device is connected")

		if device.Status == models.DeviceStatusDisconnected {
			// Device has reconnected
			if err := m.deviceRepo.UpdateStatus(ctx, deviceID, models.DeviceStatusActive); err != nil {
				return fmt.Errorf("failed to update device status: %w", err)
			}
			m.MarkDeviceReconnected(deviceID)
		}
	}

	return nil
}

// GetDisconnectedDevicesCount returns the number of currently disconnected devices
func (m *ConnectivityMonitor) GetDisconnectedDevicesCount(ctx context.Context) (int, error) {
	devices, err := m.deviceRepo.GetDisconnectedDevices(ctx, m.disconnectThreshold)
	if err != nil {
		return 0, err
	}
	return len(devices), nil
}
