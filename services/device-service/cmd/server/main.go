package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
	"github.com/sos-app/device-service/internal/handlers"
	"github.com/sos-app/device-service/internal/mqtt"
	mqttHandlers "github.com/sos-app/device-service/internal/mqtt/handlers"
	"github.com/sos-app/device-service/internal/repository"
	"github.com/sos-app/device-service/internal/services"
)

func main() {
	// Initialize logger
	logger := zerolog.New(os.Stdout).With().Timestamp().Logger()
	logger.Info().Msg("Starting Device Service...")

	// Get configuration from environment variables
	config := getConfig()

	// Initialize database connection
	logger.Info().Msg("Connecting to database...")
	dbPool, err := initDatabase(config.DatabaseURL)
	if err != nil {
		logger.Fatal().Err(err).Msg("Failed to connect to database")
	}
	defer dbPool.Close()
	logger.Info().Msg("Database connected successfully")

	// Initialize repository
	deviceRepo := repository.NewDeviceRepository(dbPool)

	// Initialize services
	vitalsService, err := services.NewVitalsService(config.VitalsConfigPath, logger)
	if err != nil {
		logger.Fatal().Err(err).Msg("Failed to initialize vitals service")
	}

	batteryMonitor := services.NewBatteryMonitor(logger)
	connectivityMonitor := services.NewConnectivityMonitor(deviceRepo, logger)

	// Initialize MQTT client
	logger.Info().Msg("Initializing MQTT client...")
	mqttClient, err := initMQTTClient(config, logger)
	if err != nil {
		logger.Fatal().Err(err).Msg("Failed to initialize MQTT client")
	}

	// Connect to MQTT broker
	if err := mqttClient.Connect(); err != nil {
		logger.Fatal().Err(err).Msg("Failed to connect to MQTT broker")
	}
	defer mqttClient.Disconnect()

	// Initialize MQTT handlers
	telemetryHandler := mqttHandlers.NewTelemetryHandler(
		deviceRepo,
		vitalsService,
		batteryMonitor,
		logger,
	)

	eventHandler := mqttHandlers.NewEventHandler(
		deviceRepo,
		config.EmergencyServiceURL,
		logger,
	)

	// Subscribe to MQTT topics
	logger.Info().Msg("Subscribing to MQTT topics...")
	if err := mqttClient.SubscribeToDeviceTelemetry(telemetryHandler.Handle); err != nil {
		logger.Fatal().Err(err).Msg("Failed to subscribe to telemetry topic")
	}

	if err := mqttClient.SubscribeToDeviceEvents(eventHandler.Handle); err != nil {
		logger.Fatal().Err(err).Msg("Failed to subscribe to events topic")
	}
	logger.Info().Msg("MQTT subscriptions active")

	// Start connectivity monitor
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	connectivityMonitor.Start(ctx)
	defer connectivityMonitor.Stop()

	// Initialize HTTP handlers
	deviceHandler := handlers.NewDeviceHandler(deviceRepo, mqttClient, logger)
	healthHandler := handlers.NewHealthHandler(mqttClient, logger)

	// Setup HTTP router
	router := mux.NewRouter()

	// Health check endpoint
	router.HandleFunc("/health", healthHandler.HealthCheck).Methods("GET")

	// Device management endpoints
	api := router.PathPrefix("/api/v1").Subrouter()
	api.HandleFunc("/devices/pair", deviceHandler.PairDevice).Methods("POST")
	api.HandleFunc("/devices", deviceHandler.GetUserDevices).Methods("GET")
	api.HandleFunc("/devices/{id}", deviceHandler.GetDevice).Methods("GET")
	api.HandleFunc("/devices/{id}", deviceHandler.UnpairDevice).Methods("DELETE")
	api.HandleFunc("/devices/{id}/settings", deviceHandler.UpdateDeviceSettings).Methods("PUT")

	// Create HTTP server
	server := &http.Server{
		Addr:         config.ServerAddress,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start HTTP server in a goroutine
	go func() {
		logger.Info().Str("address", config.ServerAddress).Msg("Starting HTTP server...")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal().Err(err).Msg("HTTP server error")
		}
	}()

	logger.Info().Msg("Device Service is running")

	// Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info().Msg("Shutting down Device Service...")

	// Cancel context to stop connectivity monitor
	cancel()

	// Graceful shutdown with timeout
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	// Shutdown HTTP server
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error().Err(err).Msg("HTTP server shutdown error")
	}

	logger.Info().Msg("Device Service stopped")
}

// Config holds application configuration
type Config struct {
	ServerAddress       string
	DatabaseURL         string
	MQTTBrokerURL       string
	MQTTClientID        string
	MQTTUsername        string
	MQTTPassword        string
	MQTTUseTLS          bool
	EmergencyServiceURL string
	VitalsConfigPath    string
}

// getConfig loads configuration from environment variables
func getConfig() Config {
	return Config{
		ServerAddress:       getEnv("SERVER_ADDRESS", ":8082"),
		DatabaseURL:         getEnv("DATABASE_URL", "postgres://device_user:device_pass@localhost:5432/device_db?sslmode=disable"),
		MQTTBrokerURL:       getEnv("MQTT_BROKER_URL", "tcp://localhost:1883"),
		MQTTClientID:        getEnv("MQTT_CLIENT_ID", "device-service"),
		MQTTUsername:        getEnv("MQTT_USERNAME", ""),
		MQTTPassword:        getEnv("MQTT_PASSWORD", ""),
		MQTTUseTLS:          getEnv("MQTT_USE_TLS", "false") == "true",
		EmergencyServiceURL: getEnv("EMERGENCY_SERVICE_URL", "http://emergency-service:8080"),
		VitalsConfigPath:    getEnv("VITALS_CONFIG_PATH", "/app/configs/vitals_thresholds.yaml"),
	}
}

// getEnv gets an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// initDatabase initializes the database connection pool
func initDatabase(databaseURL string) (*pgxpool.Pool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database URL: %w", err)
	}

	// Set connection pool settings
	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = 1 * time.Hour
	config.MaxConnIdleTime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test connection
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return pool, nil
}

// initMQTTClient initializes the MQTT client
func initMQTTClient(config Config, logger zerolog.Logger) (*mqtt.Client, error) {
	mqttConfig := mqtt.Config{
		BrokerURL:      config.MQTTBrokerURL,
		ClientID:       config.MQTTClientID,
		Username:       config.MQTTUsername,
		Password:       config.MQTTPassword,
		UseTLS:         config.MQTTUseTLS,
		TLSSkipVerify:  true, // Set to false in production with proper certificates
		CleanSession:   false,
		AutoReconnect:  true,
		ConnectTimeout: 10 * time.Second,
		KeepAlive:      60 * time.Second,
	}

	return mqtt.NewClient(mqttConfig, logger)
}
