package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/sos-app/location-service/internal/models"
)

// Client represents a WebSocket client
type Client struct {
	ID           string
	EmergencyID  uuid.UUID
	SendChan     chan []byte
	DisconnectCh chan bool
}

// BroadcastService manages WebSocket connections and broadcasts
type BroadcastService struct {
	clients      map[string]*Client
	clientsMutex sync.RWMutex
	rooms        map[uuid.UUID]map[string]*Client
	roomsMutex   sync.RWMutex
	redisClient  *redis.Client
	pubsub       *redis.PubSub
	ctx          context.Context
	stopChan     chan bool
}

// NewBroadcastService creates a new broadcast service
func NewBroadcastService(redisURL string) *BroadcastService {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		panic(fmt.Sprintf("Failed to parse Redis URL: %v", err))
	}

	client := redis.NewClient(opts)

	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		panic(fmt.Sprintf("Failed to connect to Redis: %v", err))
	}

	// Subscribe to location-updated channel
	pubsub := client.Subscribe(ctx, "location-updated")

	return &BroadcastService{
		clients:     make(map[string]*Client),
		rooms:       make(map[uuid.UUID]map[string]*Client),
		redisClient: client,
		pubsub:      pubsub,
		ctx:         ctx,
		stopChan:    make(chan bool),
	}
}

// Start begins listening for Redis pub/sub messages
func (b *BroadcastService) Start() {
	log.Println("WebSocket broadcast service started")

	// Listen for messages from Redis
	go b.listenToRedis()

	// Periodic cleanup of disconnected clients
	ticker := time.NewTicker(30 * time.Second)
	go func() {
		for {
			select {
			case <-ticker.C:
				b.cleanupDisconnectedClients()
			case <-b.stopChan:
				ticker.Stop()
				return
			}
		}
	}()
}

// Stop stops the broadcast service
func (b *BroadcastService) Stop() {
	close(b.stopChan)
	b.pubsub.Close()
	b.redisClient.Close()
	log.Println("WebSocket broadcast service stopped")
}

// listenToRedis listens for location updates from Redis Pub/Sub
func (b *BroadcastService) listenToRedis() {
	channel := b.pubsub.Channel()

	for {
		select {
		case msg := <-channel:
			if msg == nil {
				continue
			}

			// Parse the message
			var locationUpdate struct {
				EventType   string    `json:"eventType"`
				EmergencyID string    `json:"emergencyId"`
				Location    *models.LocationPoint `json:"location"`
			}

			if err := json.Unmarshal([]byte(msg.Payload), &locationUpdate); err != nil {
				log.Printf("Failed to parse location update: %v", err)
				continue
			}

			// Broadcast to all clients in the emergency room
			emergencyID, err := uuid.Parse(locationUpdate.EmergencyID)
			if err != nil {
				log.Printf("Invalid emergency ID: %v", err)
				continue
			}

			// Create WebSocket message
			wsMessage := models.WebSocketMessage{
				Type:        "location:update",
				EmergencyID: emergencyID,
				Location:    locationUpdate.Location,
			}

			messageBytes, err := json.Marshal(wsMessage)
			if err != nil {
				log.Printf("Failed to marshal WebSocket message: %v", err)
				continue
			}

			b.BroadcastToRoom(emergencyID, messageBytes)

		case <-b.stopChan:
			return
		}
	}
}

// AddClient adds a new WebSocket client
func (b *BroadcastService) AddClient(client *Client) {
	b.clientsMutex.Lock()
	defer b.clientsMutex.Unlock()

	b.clients[client.ID] = client
	log.Printf("Client %s connected", client.ID)
}

// RemoveClient removes a WebSocket client
func (b *BroadcastService) RemoveClient(clientID string) {
	b.clientsMutex.Lock()
	defer b.clientsMutex.Unlock()

	if client, exists := b.clients[clientID]; exists {
		// Remove from room
		b.LeaveRoom(client.EmergencyID, clientID)

		// Close send channel
		close(client.SendChan)

		// Remove from clients map
		delete(b.clients, clientID)
		log.Printf("Client %s disconnected", clientID)
	}
}

// JoinRoom adds a client to an emergency room
func (b *BroadcastService) JoinRoom(emergencyID uuid.UUID, clientID string) {
	b.clientsMutex.RLock()
	client, exists := b.clients[clientID]
	b.clientsMutex.RUnlock()

	if !exists {
		return
	}

	b.roomsMutex.Lock()
	defer b.roomsMutex.Unlock()

	if b.rooms[emergencyID] == nil {
		b.rooms[emergencyID] = make(map[string]*Client)
	}

	b.rooms[emergencyID][clientID] = client
	client.EmergencyID = emergencyID
	log.Printf("Client %s joined room for emergency %s", clientID, emergencyID)
}

// LeaveRoom removes a client from an emergency room
func (b *BroadcastService) LeaveRoom(emergencyID uuid.UUID, clientID string) {
	b.roomsMutex.Lock()
	defer b.roomsMutex.Unlock()

	if room, exists := b.rooms[emergencyID]; exists {
		delete(room, clientID)
		log.Printf("Client %s left room for emergency %s", clientID, emergencyID)

		// Clean up empty rooms
		if len(room) == 0 {
			delete(b.rooms, emergencyID)
		}
	}
}

// BroadcastToRoom sends a message to all clients in a room
func (b *BroadcastService) BroadcastToRoom(emergencyID uuid.UUID, message []byte) {
	b.roomsMutex.RLock()
	defer b.roomsMutex.RUnlock()

	room, exists := b.rooms[emergencyID]
	if !exists || len(room) == 0 {
		return
	}

	log.Printf("Broadcasting to %d clients in emergency %s", len(room), emergencyID)

	for _, client := range room {
		select {
		case client.SendChan <- message:
			// Message sent successfully
		default:
			// Channel is full or closed, skip
			log.Printf("Failed to send to client %s, channel full or closed", client.ID)
		}
	}
}

// PublishLocationUpdate publishes a location update to Redis Pub/Sub
func (b *BroadcastService) PublishLocationUpdate(emergencyID uuid.UUID, location *models.LocationPoint) error {
	message := map[string]interface{}{
		"eventType":   "LocationUpdated",
		"emergencyId": emergencyID.String(),
		"location":    location,
		"timestamp":   time.Now().UTC(),
	}

	messageBytes, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	return b.redisClient.Publish(b.ctx, "location-updated", messageBytes).Err()
}

// GetRoomClients returns the number of clients in a room
func (b *BroadcastService) GetRoomClients(emergencyID uuid.UUID) int {
	b.roomsMutex.RLock()
	defer b.roomsMutex.RUnlock()

	if room, exists := b.rooms[emergencyID]; exists {
		return len(room)
	}
	return 0
}

// cleanupDisconnectedClients removes clients that have been disconnected
func (b *BroadcastService) cleanupDisconnectedClients() {
	b.clientsMutex.Lock()
	defer b.clientsMutex.Unlock()

	for clientID, client := range b.clients {
		select {
		case <-client.DisconnectCh:
			// Client has disconnected
			b.RemoveClient(clientID)
		default:
			// Client still connected
		}
	}
}
