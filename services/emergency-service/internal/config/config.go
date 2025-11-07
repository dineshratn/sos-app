package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds all configuration for the Emergency Service
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Kafka    KafkaConfig
	Service  ServiceConfig
}

// ServerConfig contains HTTP server configuration
type ServerConfig struct {
	Port            string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	IdleTimeout     time.Duration
	ShutdownTimeout time.Duration
}

// DatabaseConfig contains database connection configuration
type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
	MaxConns int
	MinConns int
}

// KafkaConfig contains Kafka broker configuration
type KafkaConfig struct {
	Brokers                []string
	EmergencyCreatedTopic  string
	EmergencyResolvedTopic string
	EmergencyCancelledTopic string
	ContactAcknowledgedTopic string
	LocationUpdatedTopic   string
	ConsumerGroup          string
}

// ServiceConfig contains business logic configuration
type ServiceConfig struct {
	CountdownSeconds     int
	EscalationTimeoutMin int
	MaxEmergenciesPerUser int
}

// Load loads configuration from environment variables with defaults
func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port:            getEnv("PORT", "8080"),
			ReadTimeout:     getDurationEnv("READ_TIMEOUT", 15*time.Second),
			WriteTimeout:    getDurationEnv("WRITE_TIMEOUT", 15*time.Second),
			IdleTimeout:     getDurationEnv("IDLE_TIMEOUT", 60*time.Second),
			ShutdownTimeout: getDurationEnv("SHUTDOWN_TIMEOUT", 30*time.Second),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "postgres"),
			DBName:   getEnv("DB_NAME", "sos_app_emergency"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
			MaxConns: getIntEnv("DB_MAX_CONNS", 25),
			MinConns: getIntEnv("DB_MIN_CONNS", 5),
		},
		Kafka: KafkaConfig{
			Brokers:                []string{getEnv("KAFKA_BROKERS", "localhost:9092")},
			EmergencyCreatedTopic:  getEnv("KAFKA_EMERGENCY_CREATED_TOPIC", "emergency-created"),
			EmergencyResolvedTopic: getEnv("KAFKA_EMERGENCY_RESOLVED_TOPIC", "emergency-resolved"),
			EmergencyCancelledTopic: getEnv("KAFKA_EMERGENCY_CANCELLED_TOPIC", "emergency-cancelled"),
			ContactAcknowledgedTopic: getEnv("KAFKA_CONTACT_ACKNOWLEDGED_TOPIC", "contact-acknowledged"),
			LocationUpdatedTopic:   getEnv("KAFKA_LOCATION_UPDATED_TOPIC", "location-updated"),
			ConsumerGroup:          getEnv("KAFKA_CONSUMER_GROUP", "emergency-service"),
		},
		Service: ServiceConfig{
			CountdownSeconds:     getIntEnv("COUNTDOWN_SECONDS", 10),
			EscalationTimeoutMin: getIntEnv("ESCALATION_TIMEOUT_MIN", 2),
			MaxEmergenciesPerUser: getIntEnv("MAX_EMERGENCIES_PER_USER", 1),
		},
	}
}

// ConnectionString returns PostgreSQL connection string
func (c *DatabaseConfig) ConnectionString() string {
	return "host=" + c.Host +
		" port=" + c.Port +
		" user=" + c.User +
		" password=" + c.Password +
		" dbname=" + c.DBName +
		" sslmode=" + c.SSLMode
}

// Helper functions

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}
