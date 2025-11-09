package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/sos-app/location-service/internal/cache"
)

// GeocodingService handles reverse geocoding
type GeocodingService struct {
	apiKey   string
	provider string
	cache    *cache.GeospatialCache
	client   *http.Client
}

// NewGeocodingService creates a new geocoding service
func NewGeocodingService(apiKey string, cache *cache.GeospatialCache) *GeocodingService {
	return &GeocodingService{
		apiKey:   apiKey,
		provider: "mapbox", // Default to Mapbox
		cache:    cache,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// ReverseGeocode converts coordinates to a human-readable address
func (s *GeocodingService) ReverseGeocode(latitude, longitude float64) (string, error) {
	// Check cache first
	cachedAddress, err := s.cache.GetGeocodedAddress(latitude, longitude)
	if err == nil && cachedAddress != "" {
		return cachedAddress, nil
	}

	// Perform reverse geocoding based on provider
	var address string
	if s.provider == "mapbox" {
		address, err = s.reverseGeocodeMapbox(latitude, longitude)
	} else if s.provider == "google" {
		address, err = s.reverseGeocodeGoogle(latitude, longitude)
	} else {
		return "", fmt.Errorf("unsupported geocoding provider: %s", s.provider)
	}

	if err != nil {
		return "", err
	}

	// Cache the result
	if err := s.cache.CacheGeocodedAddress(latitude, longitude, address); err != nil {
		fmt.Printf("Failed to cache geocoded address: %v\n", err)
	}

	return address, nil
}

// reverseGeocodeMapbox uses Mapbox Geocoding API
func (s *GeocodingService) reverseGeocodeMapbox(latitude, longitude float64) (string, error) {
	if s.apiKey == "" {
		return "", fmt.Errorf("Mapbox API key not configured")
	}

	// Mapbox Geocoding API endpoint
	baseURL := fmt.Sprintf("https://api.mapbox.com/geocoding/v5/mapbox.places/%f,%f.json", longitude, latitude)

	params := url.Values{}
	params.Add("access_token", s.apiKey)
	params.Add("types", "address,poi,place")
	params.Add("limit", "1")

	requestURL := fmt.Sprintf("%s?%s", baseURL, params.Encode())

	resp, err := s.client.Get(requestURL)
	if err != nil {
		return "", fmt.Errorf("failed to call Mapbox API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Mapbox API error (status %d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		Features []struct {
			PlaceName string `json:"place_name"`
		} `json:"features"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode Mapbox response: %w", err)
	}

	if len(result.Features) == 0 {
		return "", fmt.Errorf("no results found")
	}

	return result.Features[0].PlaceName, nil
}

// reverseGeocodeGoogle uses Google Maps Geocoding API
func (s *GeocodingService) reverseGeocodeGoogle(latitude, longitude float64) (string, error) {
	if s.apiKey == "" {
		return "", fmt.Errorf("Google Maps API key not configured")
	}

	// Google Maps Geocoding API endpoint
	baseURL := "https://maps.googleapis.com/maps/api/geocode/json"

	params := url.Values{}
	params.Add("latlng", fmt.Sprintf("%f,%f", latitude, longitude))
	params.Add("key", s.apiKey)

	requestURL := fmt.Sprintf("%s?%s", baseURL, params.Encode())

	resp, err := s.client.Get(requestURL)
	if err != nil {
		return "", fmt.Errorf("failed to call Google Maps API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Google Maps API error (status %d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		Results []struct {
			FormattedAddress string `json:"formatted_address"`
		} `json:"results"`
		Status string `json:"status"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode Google Maps response: %w", err)
	}

	if result.Status != "OK" {
		return "", fmt.Errorf("Google Maps API error: %s", result.Status)
	}

	if len(result.Results) == 0 {
		return "", fmt.Errorf("no results found")
	}

	return result.Results[0].FormattedAddress, nil
}

// SetProvider sets the geocoding provider
func (s *GeocodingService) SetProvider(provider string) {
	s.provider = provider
}
