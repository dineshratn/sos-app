package cache

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/sos-app/location-service/internal/models"
)

// GeospatialCache handles Redis geospatial caching for locations
type GeospatialCache struct {
	client *redis.Client
	ctx    context.Context
}

// NewGeospatialCache creates a new geospatial cache
func NewGeospatialCache(redisURL string) *GeospatialCache {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		panic(fmt.Sprintf("Failed to parse Redis URL: %v", err))
	}

	client := redis.NewClient(opts)

	// Test connection
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		panic(fmt.Sprintf("Failed to connect to Redis: %v", err))
	}

	return &GeospatialCache{
		client: client,
		ctx:    ctx,
	}
}

// Close closes the Redis connection
func (c *GeospatialCache) Close() error {
	return c.client.Close()
}

// getCacheKey generates a Redis key for an emergency's location
func (c *GeospatialCache) getCacheKey(emergencyID uuid.UUID) string {
	return fmt.Sprintf("location:emergency:%s", emergencyID.String())
}

// getGeoKey generates a Redis key for geospatial index
func (c *GeospatialCache) getGeoKey() string {
	return "locations:geo"
}

// SetCurrentLocation stores the current location in Redis using GEOADD
func (c *GeospatialCache) SetCurrentLocation(emergencyID uuid.UUID, location *models.LocationPoint) error {
	// Store in geospatial index
	geoKey := c.getGeoKey()
	member := emergencyID.String()

	err := c.client.GeoAdd(c.ctx, geoKey, &redis.GeoLocation{
		Name:      member,
		Longitude: location.Longitude,
		Latitude:  location.Latitude,
	}).Err()

	if err != nil {
		return fmt.Errorf("failed to add to geospatial index: %w", err)
	}

	// Store detailed location data in a hash
	cacheKey := c.getCacheKey(emergencyID)
	locationData := map[string]interface{}{
		"emergencyId":  emergencyID.String(),
		"userId":       location.UserID.String(),
		"latitude":     location.Latitude,
		"longitude":    location.Longitude,
		"timestamp":    location.Timestamp.Format(time.RFC3339),
		"provider":     string(location.Provider),
	}

	if location.Accuracy != nil {
		locationData["accuracy"] = *location.Accuracy
	}
	if location.Altitude != nil {
		locationData["altitude"] = *location.Altitude
	}
	if location.Speed != nil {
		locationData["speed"] = *location.Speed
	}
	if location.Heading != nil {
		locationData["heading"] = *location.Heading
	}
	if location.Address != nil {
		locationData["address"] = *location.Address
	}
	if location.BatteryLevel != nil {
		locationData["batteryLevel"] = *location.BatteryLevel
	}

	err = c.client.HSet(c.ctx, cacheKey, locationData).Err()
	if err != nil {
		return fmt.Errorf("failed to set location data: %w", err)
	}

	// Set expiration (30 minutes default, extended on each update)
	err = c.client.Expire(c.ctx, cacheKey, 30*time.Minute).Err()
	if err != nil {
		return fmt.Errorf("failed to set expiration: %w", err)
	}

	return nil
}

// GetCurrentLocation retrieves the current location from Redis
func (c *GeospatialCache) GetCurrentLocation(emergencyID uuid.UUID) (*models.LocationPoint, error) {
	cacheKey := c.getCacheKey(emergencyID)

	// Check if key exists
	exists, err := c.client.Exists(c.ctx, cacheKey).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to check key existence: %w", err)
	}
	if exists == 0 {
		return nil, nil // Not found in cache
	}

	// Get all hash fields
	data, err := c.client.HGetAll(c.ctx, cacheKey).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get location data: %w", err)
	}

	if len(data) == 0 {
		return nil, nil
	}

	// Parse the data into LocationPoint
	location := &models.LocationPoint{}

	if emergencyIDStr, ok := data["emergencyId"]; ok {
		location.EmergencyID, _ = uuid.Parse(emergencyIDStr)
	}
	if userIDStr, ok := data["userId"]; ok {
		location.UserID, _ = uuid.Parse(userIDStr)
	}

	// Parse numeric fields
	if latStr, ok := data["latitude"]; ok {
		fmt.Sscanf(latStr, "%f", &location.Latitude)
	}
	if lngStr, ok := data["longitude"]; ok {
		fmt.Sscanf(lngStr, "%f", &location.Longitude)
	}

	if accStr, ok := data["accuracy"]; ok {
		var acc float64
		fmt.Sscanf(accStr, "%f", &acc)
		location.Accuracy = &acc
	}
	if altStr, ok := data["altitude"]; ok {
		var alt float64
		fmt.Sscanf(altStr, "%f", &alt)
		location.Altitude = &alt
	}
	if spdStr, ok := data["speed"]; ok {
		var spd float64
		fmt.Sscanf(spdStr, "%f", &spd)
		location.Speed = &spd
	}
	if hdgStr, ok := data["heading"]; ok {
		var hdg float64
		fmt.Sscanf(hdgStr, "%f", &hdg)
		location.Heading = &hdg
	}
	if battStr, ok := data["batteryLevel"]; ok {
		var batt int
		fmt.Sscanf(battStr, "%d", &batt)
		location.BatteryLevel = &batt
	}

	if provider, ok := data["provider"]; ok {
		location.Provider = models.LocationProvider(provider)
	}
	if address, ok := data["address"]; ok {
		location.Address = &address
	}
	if timestampStr, ok := data["timestamp"]; ok {
		location.Timestamp, _ = time.Parse(time.RFC3339, timestampStr)
	}

	return location, nil
}

// FindNearbyEmergencies finds emergencies within a radius (in meters)
func (c *GeospatialCache) FindNearbyEmergencies(latitude, longitude, radiusMeters float64) ([]uuid.UUID, error) {
	geoKey := c.getGeoKey()

	results, err := c.client.GeoRadius(c.ctx, geoKey, longitude, latitude, &redis.GeoRadiusQuery{
		Radius:      radiusMeters,
		Unit:        "m",
		WithCoord:   false,
		WithDist:    true,
		WithGeoHash: false,
		Count:       100,
		Sort:        "ASC",
	}).Result()

	if err != nil {
		return nil, fmt.Errorf("failed to search nearby emergencies: %w", err)
	}

	var emergencyIDs []uuid.UUID
	for _, result := range results {
		if id, err := uuid.Parse(result.Name); err == nil {
			emergencyIDs = append(emergencyIDs, id)
		}
	}

	return emergencyIDs, nil
}

// DeleteLocation removes a location from the cache
func (c *GeospatialCache) DeleteLocation(emergencyID uuid.UUID) error {
	// Remove from geospatial index
	geoKey := c.getGeoKey()
	err := c.client.ZRem(c.ctx, geoKey, emergencyID.String()).Err()
	if err != nil {
		return fmt.Errorf("failed to remove from geospatial index: %w", err)
	}

	// Delete the hash
	cacheKey := c.getCacheKey(emergencyID)
	err = c.client.Del(c.ctx, cacheKey).Err()
	if err != nil {
		return fmt.Errorf("failed to delete location data: %w", err)
	}

	return nil
}

// SetWithTTL sets a location with a custom TTL
func (c *GeospatialCache) SetWithTTL(emergencyID uuid.UUID, location *models.LocationPoint, ttl time.Duration) error {
	if err := c.SetCurrentLocation(emergencyID, location); err != nil {
		return err
	}

	cacheKey := c.getCacheKey(emergencyID)
	return c.client.Expire(c.ctx, cacheKey, ttl).Err()
}

// GetDistance calculates the distance between two emergencies in meters
func (c *GeospatialCache) GetDistance(emergency1, emergency2 uuid.UUID) (float64, error) {
	geoKey := c.getGeoKey()

	dist, err := c.client.GeoDist(
		c.ctx,
		geoKey,
		emergency1.String(),
		emergency2.String(),
		"m",
	).Result()

	if err == redis.Nil {
		return 0, fmt.Errorf("one or both emergencies not found in cache")
	}
	if err != nil {
		return 0, fmt.Errorf("failed to calculate distance: %w", err)
	}

	return dist, nil
}

// CacheGeocodedAddress stores a geocoded address in cache
func (c *GeospatialCache) CacheGeocodedAddress(latitude, longitude float64, address string) error {
	key := fmt.Sprintf("geocode:%f:%f", latitude, longitude)
	return c.client.Set(c.ctx, key, address, 24*time.Hour).Err()
}

// GetGeocodedAddress retrieves a cached geocoded address
func (c *GeospatialCache) GetGeocodedAddress(latitude, longitude float64) (string, error) {
	key := fmt.Sprintf("geocode:%f:%f", latitude, longitude)
	address, err := c.client.Get(c.ctx, key).Result()
	if err == redis.Nil {
		return "", nil // Not in cache
	}
	if err != nil {
		return "", fmt.Errorf("failed to get geocoded address: %w", err)
	}
	return address, nil
}

// Ping checks if Redis is reachable
func (c *GeospatialCache) Ping() error {
	return c.client.Ping(c.ctx).Err()
}
