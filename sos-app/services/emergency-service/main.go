package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

const (
	defaultPort            = "8080"
	defaultDBConnString    = "postgres://postgres:postgres@localhost:5432/sos_app_emergency?sslmode=disable"
	defaultKafkaBrokers    = "localhost:9092"
	defaultShutdownTimeout = 30 * time.Second
)

func main() {
	// Initialize logger
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: time.RFC3339})

	log.Info().Msg("Starting Emergency Service...")

	// Get configuration from environment variables
	port := getEnv("PORT", defaultPort)
	dbConnString := getEnv("DATABASE_URL", defaultDBConnString)
	kafkaBrokers := getEnv("KAFKA_BROKERS", defaultKafkaBrokers)

	log.Info().
		Str("port", port).
		Str("database", dbConnString).
		Str("kafka", kafkaBrokers).
		Msg("Configuration loaded")

	// Initialize router
	router := mux.NewRouter()

	// Health check endpoint
	router.HandleFunc("/health", healthCheckHandler).Methods("GET")
	router.HandleFunc("/ready", readyCheckHandler).Methods("GET")

	// API v1 routes
	v1 := router.PathPrefix("/api/v1").Subrouter()

	// Emergency routes (to be implemented)
	v1.HandleFunc("/emergency/trigger", notImplementedHandler).Methods("POST")
	v1.HandleFunc("/emergency/auto-trigger", notImplementedHandler).Methods("POST")
	v1.HandleFunc("/emergency/{id}", notImplementedHandler).Methods("GET")
	v1.HandleFunc("/emergency/{id}/cancel", notImplementedHandler).Methods("PUT")
	v1.HandleFunc("/emergency/{id}/resolve", notImplementedHandler).Methods("PUT")
	v1.HandleFunc("/emergency/{id}/acknowledge", notImplementedHandler).Methods("POST")
	v1.HandleFunc("/emergency/history", notImplementedHandler).Methods("GET")

	// CORS middleware
	router.Use(corsMiddleware)

	// Logging middleware
	router.Use(loggingMiddleware)

	// Create HTTP server
	server := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Info().Str("address", server.Addr).Msg("Emergency Service listening")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Server failed to start")
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down Emergency Service...")

	// Create shutdown context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), defaultShutdownTimeout)
	defer cancel()

	// Attempt graceful shutdown
	if err := server.Shutdown(ctx); err != nil {
		log.Error().Err(err).Msg("Server forced to shutdown")
	}

	log.Info().Msg("Emergency Service stopped")
}

// getEnv retrieves environment variable or returns default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// healthCheckHandler returns service health status
func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"healthy","service":"emergency-service"}`))
}

// readyCheckHandler returns service readiness status
func readyCheckHandler(w http.ResponseWriter, r *http.Request) {
	// TODO: Check database and Kafka connectivity
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ready","service":"emergency-service"}`))
}

// notImplementedHandler is a placeholder for endpoints to be implemented
func notImplementedHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	w.Write([]byte(`{"error":"endpoint not yet implemented"}`))
}

// corsMiddleware adds CORS headers to responses
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// loggingMiddleware logs HTTP requests
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Call the next handler
		next.ServeHTTP(w, r)

		// Log request details
		log.Info().
			Str("method", r.Method).
			Str("path", r.URL.Path).
			Str("remote_addr", r.RemoteAddr).
			Dur("duration", time.Since(start)).
			Msg("HTTP request")
	})
}
