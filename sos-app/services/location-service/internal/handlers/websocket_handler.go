package handlers

import (
	"context"
	"encoding/json"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/google/uuid"
	"github.com/sos-app/location-service/internal/models"
	"github.com/sos-app/location-service/internal/services"
	ws "github.com/sos-app/location-service/internal/websocket"
)

// WebSocketHandler handles WebSocket connections
type WebSocketHandler struct {
	broadcastService *ws.BroadcastService
	locationService  *services.LocationService
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler(broadcastService *ws.BroadcastService, locationService *services.LocationService) *WebSocketHandler {
	return &WebSocketHandler{
		broadcastService: broadcastService,
		locationService:  locationService,
	}
}

// Subscribe handles WebSocket connection upgrade and subscriptions
func (h *WebSocketHandler) Subscribe(c *fiber.Ctx) error {
	// Check if request is WebSocket upgrade
	if websocket.IsWebSocketUpgrade(c) {
		return websocket.New(h.handleWebSocketConnection)(c)
	}

	return c.Status(fiber.StatusUpgradeRequired).JSON(fiber.Map{
		"error": "WebSocket upgrade required",
	})
}

// handleWebSocketConnection manages an individual WebSocket connection
func (h *WebSocketHandler) handleWebSocketConnection(c *websocket.Conn) {
	// Generate client ID
	clientID := uuid.New().String()

	// Create client
	client := &ws.Client{
		ID:           clientID,
		SendChan:     make(chan []byte, 256),
		DisconnectCh: make(chan bool, 1),
	}

	// Add client to broadcast service
	h.broadcastService.AddClient(client)
	defer h.broadcastService.RemoveClient(clientID)

	log.Printf("WebSocket client %s connected from %s", clientID, c.RemoteAddr())

	// Send welcome message
	welcomeMsg := map[string]interface{}{
		"type":      "connection:established",
		"clientId":  clientID,
		"message":   "Connected to location service",
		"timestamp": "now",
	}
	if msgBytes, err := json.Marshal(welcomeMsg); err == nil {
		c.WriteMessage(websocket.TextMessage, msgBytes)
	}

	// Start goroutine to send messages from channel
	go func() {
		for message := range client.SendChan {
			if err := c.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("Error writing to client %s: %v", clientID, err)
				client.DisconnectCh <- true
				return
			}
		}
	}()

	// Read messages from client
	for {
		messageType, msg, err := c.ReadMessage()
		if err != nil {
			log.Printf("Client %s disconnected: %v", clientID, err)
			client.DisconnectCh <- true
			break
		}

		if messageType == websocket.TextMessage {
			h.handleClientMessage(c, client, msg)
		}
	}
}

// handleClientMessage processes messages from the client
func (h *WebSocketHandler) handleClientMessage(conn *websocket.Conn, client *ws.Client, msg []byte) {
	var subscription models.WebSocketSubscription

	if err := json.Unmarshal(msg, &subscription); err != nil {
		log.Printf("Failed to parse client message: %v", err)
		h.sendError(conn, "Invalid message format")
		return
	}

	switch subscription.Action {
	case "subscribe":
		// Subscribe client to emergency room
		h.broadcastService.JoinRoom(subscription.EmergencyID, client.ID)

		// Send current location immediately
		go func() {
			location, err := h.locationService.GetCurrentLocation(context.Background(), subscription.EmergencyID)
			if err != nil {
				log.Printf("Failed to get current location: %v", err)
				return
			}

			if location != nil {
				wsMsg := models.WebSocketMessage{
					Type:        "location:current",
					EmergencyID: subscription.EmergencyID,
					Location:    location,
				}

				if msgBytes, err := json.Marshal(wsMsg); err == nil {
					client.SendChan <- msgBytes
				}
			}
		}()

		// Send confirmation
		response := map[string]interface{}{
			"type":        "subscription:confirmed",
			"emergencyId": subscription.EmergencyID.String(),
			"message":     "Subscribed to location updates",
		}

		if msgBytes, err := json.Marshal(response); err == nil {
			conn.WriteMessage(websocket.TextMessage, msgBytes)
		}

	case "unsubscribe":
		// Unsubscribe client from emergency room
		h.broadcastService.LeaveRoom(subscription.EmergencyID, client.ID)

		response := map[string]interface{}{
			"type":        "subscription:cancelled",
			"emergencyId": subscription.EmergencyID.String(),
			"message":     "Unsubscribed from location updates",
		}

		if msgBytes, err := json.Marshal(response); err == nil {
			conn.WriteMessage(websocket.TextMessage, msgBytes)
		}

	case "ping":
		// Respond to ping with pong
		response := map[string]interface{}{
			"type":    "pong",
			"message": "Connection alive",
		}

		if msgBytes, err := json.Marshal(response); err == nil {
			conn.WriteMessage(websocket.TextMessage, msgBytes)
		}

	default:
		h.sendError(conn, "Unknown action: "+subscription.Action)
	}
}

// sendError sends an error message to the client
func (h *WebSocketHandler) sendError(conn *websocket.Conn, message string) {
	errorMsg := map[string]interface{}{
		"type":    "error",
		"message": message,
	}

	if msgBytes, err := json.Marshal(errorMsg); err == nil {
		conn.WriteMessage(websocket.TextMessage, msgBytes)
	}
}
