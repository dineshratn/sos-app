package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
	"github.com/sos-app/location-service/internal/cache"
	"github.com/sos-app/location-service/internal/config"
	"github.com/sos-app/location-service/internal/handlers"
	"github.com/sos-app/location-service/internal/kafka"
	"github.com/sos-app/location-service/internal/repository"
	"github.com/sos-app/location-service/internal/services"
	"github.com/sos-app/location-service/internal/websocket"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Load configuration
	cfg := config.Load()

	// Initialize database connection
	db, err := repository.NewDatabase(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize Redis cache
	redisCache := cache.NewGeospatialCache(cfg.RedisURL)
	defer redisCache.Close()

	// Initialize Kafka producer
	kafkaProducer, err := kafka.NewProducer(cfg.KafkaBrokers)
	if err != nil {
		log.Fatalf("Failed to initialize Kafka producer: %v", err)
	}
	defer kafkaProducer.Close()

	// Initialize location repository
	locationRepo := repository.NewLocationRepository(db)

	// Initialize geocoding service
	geocodingService := services.NewGeocodingService(cfg.GeocodingAPIKey, redisCache)

	// Initialize location service
	locationService := services.NewLocationService(
		locationRepo,
		redisCache,
		kafkaProducer,
		geocodingService,
	)

	// Initialize WebSocket broadcast service
	broadcastService := websocket.NewBroadcastService(cfg.RedisURL)
	go broadcastService.Start()
	defer broadcastService.Stop()

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		ServerHeader: "Location-Service",
		AppName:      "SOS App Location Service v1.0.0",
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format:     "[${time}] ${status} - ${method} ${path} (${latency})\n",
		TimeFormat: "2006-01-02 15:04:05",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CorsOrigins,
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: true,
	}))

	// Health check endpoint
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "healthy",
			"service": "location-service",
			"time":    time.Now().UTC(),
		})
	})

	// Initialize handlers
	locationHandler := handlers.NewLocationHandler(locationService)
	websocketHandler := handlers.NewWebSocketHandler(broadcastService, locationService)

	// API routes
	api := app.Group("/api/v1")

	// Location endpoints
	api.Post("/location/update", locationHandler.UpdateLocation)
	api.Post("/location/batch-update", locationHandler.BatchUpdateLocation)
	api.Get("/location/current/:emergencyId", locationHandler.GetCurrentLocation)
	api.Get("/location/trail/:emergencyId", locationHandler.GetLocationTrail)
	api.Get("/location/history/:emergencyId", locationHandler.GetLocationHistory)

	// WebSocket endpoint
	api.Get("/location/subscribe", websocketHandler.Subscribe)

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-quit
		log.Println("Shutting down gracefully...")

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := app.ShutdownWithContext(ctx); err != nil {
			log.Printf("Server forced to shutdown: %v", err)
		}
	}()

	// Start server
	port := cfg.Port
	if port == "" {
		port = "3003"
	}

	log.Printf("Location Service starting on port %s...", port)
	if err := app.Listen(fmt.Sprintf(":%s", port)); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}

	log.Println("Location Service stopped")
}
