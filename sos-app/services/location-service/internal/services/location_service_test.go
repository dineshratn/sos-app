package services

import (
	"testing"

	"github.com/sos-app/location-service/internal/models"
)

func TestSelectBestLocation(t *testing.T) {
	service := &LocationService{}

	tests := []struct {
		name    string
		updates []models.LocationUpdate
		want    models.LocationProvider
	}{
		{
			name:    "empty list",
			updates: []models.LocationUpdate{},
			want:    "",
		},
		{
			name: "single GPS",
			updates: []models.LocationUpdate{
				{Provider: models.ProviderGPS},
			},
			want: models.ProviderGPS,
		},
		{
			name: "GPS over Cellular",
			updates: []models.LocationUpdate{
				{Provider: models.ProviderCellular},
				{Provider: models.ProviderGPS},
			},
			want: models.ProviderGPS,
		},
		{
			name: "Hybrid over GPS",
			updates: []models.LocationUpdate{
				{Provider: models.ProviderGPS},
				{Provider: models.ProviderHybrid},
			},
			want: models.ProviderHybrid,
		},
		{
			name: "WiFi over Cellular",
			updates: []models.LocationUpdate{
				{Provider: models.ProviderCellular},
				{Provider: models.ProviderWiFi},
			},
			want: models.ProviderWiFi,
		},
		{
			name: "Same provider - better accuracy",
			updates: []models.LocationUpdate{
				{Provider: models.ProviderGPS, Accuracy: floatPtr(20.0)},
				{Provider: models.ProviderGPS, Accuracy: floatPtr(5.0)},
			},
			want: models.ProviderGPS,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.SelectBestLocation(tt.updates)

			if len(tt.updates) == 0 {
				if result != nil {
					t.Errorf("Expected nil for empty list, got %v", result)
				}
				return
			}

			if result == nil {
				t.Errorf("Expected non-nil result, got nil")
				return
			}

			if result.Provider != tt.want {
				t.Errorf("SelectBestLocation() provider = %v, want %v", result.Provider, tt.want)
			}

			// For same provider with different accuracy, check we got the better one
			if tt.name == "Same provider - better accuracy" {
				if result.Accuracy == nil || *result.Accuracy != 5.0 {
					t.Errorf("Expected accuracy 5.0, got %v", result.Accuracy)
				}
			}
		})
	}
}

func floatPtr(f float64) *float64 {
	return &f
}
