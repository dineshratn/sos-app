package config

import (
	"os"
	"strings"
)

// Config holds the application configuration
type Config struct {
	Port             string
	DatabaseURL      string
	RedisURL         string
	KafkaBrokers     []string
	CorsOrigins      string
	GeocodingAPIKey  string
	GeocodingProvider string
}

// Load reads configuration from environment variables
func Load() *Config {
	return &Config{
		Port:             getEnv("PORT", "3003"),
		DatabaseURL:      getEnv("TIMESCALEDB_URL", "postgres://postgres:postgres@localhost:5432/sos_app_location?sslmode=disable"),
		RedisURL:         getEnv("REDIS_URL", "redis://localhost:6379/0"),
		KafkaBrokers:     strings.Split(getEnv("KAFKA_BROKERS", "localhost:9092"), ","),
		CorsOrigins:      getEnv("CORS_ORIGINS", "*"),
		GeocodingAPIKey:  getEnv("GEOCODING_API_KEY", ""),
		GeocodingProvider: getEnv("GEOCODING_PROVIDER", "mapbox"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
