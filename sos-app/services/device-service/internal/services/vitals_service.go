package services

import (
	"context"
	"fmt"
	"os"

	"github.com/rs/zerolog"
	"github.com/sos-app/device-service/internal/models"
	"gopkg.in/yaml.v3"
)

// VitalThresholds holds threshold values for vital signs
type VitalThresholds struct {
	HeartRate struct {
		Min int `yaml:"min"`
		Max int `yaml:"max"`
	} `yaml:"heart_rate"`
	SpO2 struct {
		Min int `yaml:"min"`
	} `yaml:"spo2"`
	Temperature struct {
		Min float64 `yaml:"min"`
		Max float64 `yaml:"max"`
	} `yaml:"temperature"`
	BloodPressure struct {
		Systolic struct {
			Min int `yaml:"min"`
			Max int `yaml:"max"`
		} `yaml:"systolic"`
		Diastolic struct {
			Min int `yaml:"min"`
			Max int `yaml:"max"`
		} `yaml:"diastolic"`
	} `yaml:"blood_pressure"`
}

// ThresholdsConfig holds the complete thresholds configuration
type ThresholdsConfig struct {
	Default VitalThresholds            `yaml:"default"`
	PerUser map[string]VitalThresholds `yaml:"per_user"`
}

// VitalsService monitors vital signs and sends alerts
type VitalsService struct {
	thresholds ThresholdsConfig
	logger     zerolog.Logger
}

// NewVitalsService creates a new vitals monitoring service
func NewVitalsService(configPath string, logger zerolog.Logger) (*VitalsService, error) {
	var config ThresholdsConfig

	// Load configuration from YAML file
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read vitals config: %w", err)
	}

	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse vitals config: %w", err)
	}

	logger.Info().
		Str("config_path", configPath).
		Msg("Vitals service initialized with thresholds")

	return &VitalsService{
		thresholds: config,
		logger:     logger,
	}, nil
}

// MonitorVitalSigns checks vital signs against thresholds and sends alerts
func (s *VitalsService) MonitorVitalSigns(ctx context.Context, device *models.Device, vitals *models.VitalSigns) error {
	// Get thresholds for user (or use default)
	thresholds := s.getThresholdsForUser(device.UserID)

	var alerts []string

	// Check heart rate
	if vitals.HeartRate > 0 {
		if vitals.HeartRate < thresholds.HeartRate.Min {
			alert := fmt.Sprintf("Low heart rate: %d bpm (min: %d bpm)", vitals.HeartRate, thresholds.HeartRate.Min)
			alerts = append(alerts, alert)
			s.logger.Warn().
				Str("device_id", device.ID).
				Str("user_id", device.UserID).
				Int("heart_rate", vitals.HeartRate).
				Msg(alert)
		} else if vitals.HeartRate > thresholds.HeartRate.Max {
			alert := fmt.Sprintf("High heart rate: %d bpm (max: %d bpm)", vitals.HeartRate, thresholds.HeartRate.Max)
			alerts = append(alerts, alert)
			s.logger.Warn().
				Str("device_id", device.ID).
				Str("user_id", device.UserID).
				Int("heart_rate", vitals.HeartRate).
				Msg(alert)
		}
	}

	// Check SpO2
	if vitals.SpO2 > 0 {
		if vitals.SpO2 < thresholds.SpO2.Min {
			alert := fmt.Sprintf("Low SpO2: %d%% (min: %d%%)", vitals.SpO2, thresholds.SpO2.Min)
			alerts = append(alerts, alert)
			s.logger.Warn().
				Str("device_id", device.ID).
				Str("user_id", device.UserID).
				Int("spo2", vitals.SpO2).
				Msg(alert)
		}
	}

	// Check temperature
	if vitals.Temperature > 0 {
		if vitals.Temperature < thresholds.Temperature.Min {
			alert := fmt.Sprintf("Low temperature: %.1f°C (min: %.1f°C)", vitals.Temperature, thresholds.Temperature.Min)
			alerts = append(alerts, alert)
			s.logger.Warn().
				Str("device_id", device.ID).
				Str("user_id", device.UserID).
				Float64("temperature", vitals.Temperature).
				Msg(alert)
		} else if vitals.Temperature > thresholds.Temperature.Max {
			alert := fmt.Sprintf("High temperature: %.1f°C (max: %.1f°C)", vitals.Temperature, thresholds.Temperature.Max)
			alerts = append(alerts, alert)
			s.logger.Warn().
				Str("device_id", device.ID).
				Str("user_id", device.UserID).
				Float64("temperature", vitals.Temperature).
				Msg(alert)
		}
	}

	// Check blood pressure
	if vitals.BloodPressure != nil {
		if vitals.BloodPressure.Systolic > 0 {
			if vitals.BloodPressure.Systolic < thresholds.BloodPressure.Systolic.Min {
				alert := fmt.Sprintf("Low systolic BP: %d mmHg (min: %d mmHg)",
					vitals.BloodPressure.Systolic, thresholds.BloodPressure.Systolic.Min)
				alerts = append(alerts, alert)
				s.logger.Warn().
					Str("device_id", device.ID).
					Str("user_id", device.UserID).
					Int("systolic", vitals.BloodPressure.Systolic).
					Msg(alert)
			} else if vitals.BloodPressure.Systolic > thresholds.BloodPressure.Systolic.Max {
				alert := fmt.Sprintf("High systolic BP: %d mmHg (max: %d mmHg)",
					vitals.BloodPressure.Systolic, thresholds.BloodPressure.Systolic.Max)
				alerts = append(alerts, alert)
				s.logger.Warn().
					Str("device_id", device.ID).
					Str("user_id", device.UserID).
					Int("systolic", vitals.BloodPressure.Systolic).
					Msg(alert)
			}
		}

		if vitals.BloodPressure.Diastolic > 0 {
			if vitals.BloodPressure.Diastolic < thresholds.BloodPressure.Diastolic.Min {
				alert := fmt.Sprintf("Low diastolic BP: %d mmHg (min: %d mmHg)",
					vitals.BloodPressure.Diastolic, thresholds.BloodPressure.Diastolic.Min)
				alerts = append(alerts, alert)
				s.logger.Warn().
					Str("device_id", device.ID).
					Str("user_id", device.UserID).
					Int("diastolic", vitals.BloodPressure.Diastolic).
					Msg(alert)
			} else if vitals.BloodPressure.Diastolic > thresholds.BloodPressure.Diastolic.Max {
				alert := fmt.Sprintf("High diastolic BP: %d mmHg (max: %d mmHg)",
					vitals.BloodPressure.Diastolic, thresholds.BloodPressure.Diastolic.Max)
				alerts = append(alerts, alert)
				s.logger.Warn().
					Str("device_id", device.ID).
					Str("user_id", device.UserID).
					Int("diastolic", vitals.BloodPressure.Diastolic).
					Msg(alert)
			}
		}
	}

	// Send notifications for all alerts
	if len(alerts) > 0 {
		if err := s.sendVitalSignsAlert(ctx, device, vitals, alerts); err != nil {
			return err
		}
	}

	return nil
}

// getThresholdsForUser returns thresholds for a specific user or default
func (s *VitalsService) getThresholdsForUser(userID string) VitalThresholds {
	if thresholds, ok := s.thresholds.PerUser[userID]; ok {
		return thresholds
	}
	return s.thresholds.Default
}

// sendVitalSignsAlert sends notification when vital signs exceed thresholds
func (s *VitalsService) sendVitalSignsAlert(ctx context.Context, device *models.Device, vitals *models.VitalSigns, alerts []string) error {
	// In a real implementation, this would call a notification service
	// For now, we just log the alerts

	s.logger.Warn().
		Str("device_id", device.ID).
		Str("user_id", device.UserID).
		Strs("alerts", alerts).
		Interface("vitals", vitals).
		Msg("Vital signs threshold exceeded - notification should be sent")

	// TODO: Integrate with notification service
	// Example:
	// notificationPayload := map[string]interface{}{
	//     "user_id": device.UserID,
	//     "type": "VITAL_SIGNS_ALERT",
	//     "priority": "HIGH",
	//     "message": strings.Join(alerts, "; "),
	//     "vitals": vitals,
	// }
	// Send to notification service...

	return nil
}

// CheckHeartRate checks if heart rate is within normal range
func (s *VitalsService) CheckHeartRate(userID string, heartRate int) bool {
	thresholds := s.getThresholdsForUser(userID)
	return heartRate >= thresholds.HeartRate.Min && heartRate <= thresholds.HeartRate.Max
}

// CheckSpO2 checks if SpO2 is within normal range
func (s *VitalsService) CheckSpO2(userID string, spo2 int) bool {
	thresholds := s.getThresholdsForUser(userID)
	return spo2 >= thresholds.SpO2.Min
}

// CheckTemperature checks if temperature is within normal range
func (s *VitalsService) CheckTemperature(userID string, temperature float64) bool {
	thresholds := s.getThresholdsForUser(userID)
	return temperature >= thresholds.Temperature.Min && temperature <= thresholds.Temperature.Max
}
