package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/sos-app/location-service/internal/models"
	"github.com/sos-app/location-service/internal/services"
)

// LocationHandler handles HTTP requests for location operations
type LocationHandler struct {
	locationService *services.LocationService
}

// NewLocationHandler creates a new location handler
func NewLocationHandler(locationService *services.LocationService) *LocationHandler {
	return &LocationHandler{
		locationService: locationService,
	}
}

// UpdateLocation handles POST /api/v1/location/update
func (h *LocationHandler) UpdateLocation(c *fiber.Ctx) error {
	var update models.LocationUpdate

	if err := c.BodyParser(&update); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate the update
	if err := update.Validate(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Validation failed",
			"details": err.Error(),
		})
	}

	// Process the location update
	if err := h.locationService.UpdateLocation(c.Context(), &update); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update location",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success":     true,
		"message":     "Location updated successfully",
		"emergencyId": update.EmergencyID,
		"timestamp":   time.Now().UTC(),
	})
}

// BatchUpdateLocation handles POST /api/v1/location/batch-update (for offline sync)
func (h *LocationHandler) BatchUpdateLocation(c *fiber.Ctx) error {
	var batch models.BatchLocationUpdate

	if err := c.BodyParser(&batch); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if len(batch.Locations) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No locations provided",
		})
	}

	if len(batch.Locations) > 1000 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Too many locations (max 1000)",
		})
	}

	// Process the batch update
	if err := h.locationService.BatchUpdateLocations(c.Context(), &batch); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to batch update locations",
			"details": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success":     true,
		"message":     "Batch update successful",
		"emergencyId": batch.EmergencyID,
		"count":       len(batch.Locations),
		"timestamp":   time.Now().UTC(),
	})
}

// GetCurrentLocation handles GET /api/v1/location/current/:emergencyId
func (h *LocationHandler) GetCurrentLocation(c *fiber.Ctx) error {
	emergencyIDStr := c.Params("emergencyId")
	emergencyID, err := uuid.Parse(emergencyIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid emergency ID",
		})
	}

	location, err := h.locationService.GetCurrentLocation(c.Context(), emergencyID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get current location",
		})
	}

	if location == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "No location found for this emergency",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success":     true,
		"emergencyId": emergencyID,
		"location":    location,
	})
}

// GetLocationTrail handles GET /api/v1/location/trail/:emergencyId
func (h *LocationHandler) GetLocationTrail(c *fiber.Ctx) error {
	emergencyIDStr := c.Params("emergencyId")
	emergencyID, err := uuid.Parse(emergencyIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid emergency ID",
		})
	}

	// Get duration from query parameter (default 30 minutes)
	durationStr := c.Query("duration", "30m")
	duration, err := time.ParseDuration(durationStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid duration format (use format like '30m', '1h', '90m')",
		})
	}

	// Limit maximum duration to 24 hours
	if duration > 24*time.Hour {
		duration = 24 * time.Hour
	}

	locations, err := h.locationService.GetLocationTrail(c.Context(), emergencyID, duration)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get location trail",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success":     true,
		"emergencyId": emergencyID,
		"duration":    duration.String(),
		"locations":   locations,
		"count":       len(locations),
	})
}

// GetLocationHistory handles GET /api/v1/location/history/:emergencyId (for reporting)
func (h *LocationHandler) GetLocationHistory(c *fiber.Ctx) error {
	emergencyIDStr := c.Params("emergencyId")
	emergencyID, err := uuid.Parse(emergencyIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid emergency ID",
		})
	}

	// Get pagination parameters
	limit := c.QueryInt("limit", 100)
	offset := c.QueryInt("offset", 0)

	// Validate pagination
	if limit < 1 || limit > 1000 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	locations, total, err := h.locationService.GetLocationHistory(c.Context(), emergencyID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get location history",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success":     true,
		"emergencyId": emergencyID,
		"locations":   locations,
		"pagination": fiber.Map{
			"limit":  limit,
			"offset": offset,
			"total":  total,
			"count":  len(locations),
		},
	})
}
