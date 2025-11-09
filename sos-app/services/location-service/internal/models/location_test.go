package models

import (
	"testing"

	"github.com/google/uuid"
)

func TestLocationUpdateValidate(t *testing.T) {
	tests := []struct {
		name    string
		update  LocationUpdate
		wantErr bool
	}{
		{
			name: "valid location update",
			update: LocationUpdate{
				EmergencyID: uuid.New(),
				UserID:      uuid.New(),
				Latitude:    37.7749,
				Longitude:   -122.4194,
				Provider:    ProviderGPS,
			},
			wantErr: false,
		},
		{
			name: "invalid latitude - too high",
			update: LocationUpdate{
				EmergencyID: uuid.New(),
				UserID:      uuid.New(),
				Latitude:    91.0,
				Longitude:   0,
				Provider:    ProviderGPS,
			},
			wantErr: true,
		},
		{
			name: "invalid latitude - too low",
			update: LocationUpdate{
				EmergencyID: uuid.New(),
				UserID:      uuid.New(),
				Latitude:    -91.0,
				Longitude:   0,
				Provider:    ProviderGPS,
			},
			wantErr: true,
		},
		{
			name: "invalid longitude - too high",
			update: LocationUpdate{
				EmergencyID: uuid.New(),
				UserID:      uuid.New(),
				Latitude:    0,
				Longitude:   181.0,
				Provider:    ProviderGPS,
			},
			wantErr: true,
		},
		{
			name: "invalid longitude - too low",
			update: LocationUpdate{
				EmergencyID: uuid.New(),
				UserID:      uuid.New(),
				Latitude:    0,
				Longitude:   -181.0,
				Provider:    ProviderGPS,
			},
			wantErr: true,
		},
		{
			name: "missing provider",
			update: LocationUpdate{
				EmergencyID: uuid.New(),
				UserID:      uuid.New(),
				Latitude:    0,
				Longitude:   0,
			},
			wantErr: true,
		},
		{
			name: "negative accuracy",
			update: LocationUpdate{
				EmergencyID: uuid.New(),
				UserID:      uuid.New(),
				Latitude:    0,
				Longitude:   0,
				Provider:    ProviderGPS,
				Accuracy:    floatPtr(-1.0),
			},
			wantErr: true,
		},
		{
			name: "negative speed",
			update: LocationUpdate{
				EmergencyID: uuid.New(),
				UserID:      uuid.New(),
				Latitude:    0,
				Longitude:   0,
				Provider:    ProviderGPS,
				Speed:       floatPtr(-1.0),
			},
			wantErr: true,
		},
		{
			name: "invalid heading - too high",
			update: LocationUpdate{
				EmergencyID: uuid.New(),
				UserID:      uuid.New(),
				Latitude:    0,
				Longitude:   0,
				Provider:    ProviderGPS,
				Heading:     floatPtr(361.0),
			},
			wantErr: true,
		},
		{
			name: "invalid battery level - too high",
			update: LocationUpdate{
				EmergencyID: uuid.New(),
				UserID:      uuid.New(),
				Latitude:    0,
				Longitude:   0,
				Provider:    ProviderGPS,
				BatteryLevel: intPtr(101),
			},
			wantErr: true,
		},
		{
			name: "invalid battery level - negative",
			update: LocationUpdate{
				EmergencyID: uuid.New(),
				UserID:      uuid.New(),
				Latitude:    0,
				Longitude:   0,
				Provider:    ProviderGPS,
				BatteryLevel: intPtr(-1),
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.update.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("LocationUpdate.Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateProvider(t *testing.T) {
	tests := []struct {
		name     string
		provider LocationProvider
		want     bool
	}{
		{"GPS provider", ProviderGPS, true},
		{"Cellular provider", ProviderCellular, true},
		{"WiFi provider", ProviderWiFi, true},
		{"Hybrid provider", ProviderHybrid, true},
		{"Invalid provider", LocationProvider("INVALID"), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ValidateProvider(tt.provider); got != tt.want {
				t.Errorf("ValidateProvider() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestGetProviderPriority(t *testing.T) {
	tests := []struct {
		name     string
		provider LocationProvider
		want     int
	}{
		{"GPS highest priority", ProviderGPS, 3},
		{"Hybrid highest priority", ProviderHybrid, 4},
		{"WiFi medium priority", ProviderWiFi, 2},
		{"Cellular lowest priority", ProviderCellular, 1},
		{"Invalid provider", LocationProvider("INVALID"), 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := GetProviderPriority(tt.provider); got != tt.want {
				t.Errorf("GetProviderPriority() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestToLocationPoint(t *testing.T) {
	update := LocationUpdate{
		EmergencyID: uuid.New(),
		UserID:      uuid.New(),
		Latitude:    37.7749,
		Longitude:   -122.4194,
		Accuracy:    floatPtr(10.5),
		Provider:    ProviderGPS,
	}

	point := update.ToLocationPoint()

	if point.EmergencyID != update.EmergencyID {
		t.Errorf("EmergencyID mismatch: got %v, want %v", point.EmergencyID, update.EmergencyID)
	}
	if point.UserID != update.UserID {
		t.Errorf("UserID mismatch: got %v, want %v", point.UserID, update.UserID)
	}
	if point.Latitude != update.Latitude {
		t.Errorf("Latitude mismatch: got %v, want %v", point.Latitude, update.Latitude)
	}
	if point.Longitude != update.Longitude {
		t.Errorf("Longitude mismatch: got %v, want %v", point.Longitude, update.Longitude)
	}
	if point.Provider != update.Provider {
		t.Errorf("Provider mismatch: got %v, want %v", point.Provider, update.Provider)
	}
	if point.Accuracy == nil || *point.Accuracy != *update.Accuracy {
		t.Errorf("Accuracy mismatch: got %v, want %v", point.Accuracy, update.Accuracy)
	}
}

// Helper functions
func floatPtr(f float64) *float64 {
	return &f
}

func intPtr(i int) *int {
	return &i
}
