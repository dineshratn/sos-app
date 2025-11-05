package mqtt

import (
	"crypto/tls"
	"fmt"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/rs/zerolog"
)

// Client represents an MQTT client for IoT device communication
type Client struct {
	client mqtt.Client
	logger zerolog.Logger
}

// Config holds MQTT client configuration
type Config struct {
	BrokerURL      string
	ClientID       string
	Username       string
	Password       string
	UseTLS         bool
	TLSSkipVerify  bool
	CleanSession   bool
	AutoReconnect  bool
	ConnectTimeout time.Duration
	KeepAlive      time.Duration
}

// MessageHandler is a callback function for handling MQTT messages
type MessageHandler func(topic string, payload []byte) error

// NewClient creates a new MQTT client
func NewClient(config Config, logger zerolog.Logger) (*Client, error) {
	opts := mqtt.NewClientOptions()
	opts.AddBroker(config.BrokerURL)
	opts.SetClientID(config.ClientID)

	if config.Username != "" {
		opts.SetUsername(config.Username)
	}
	if config.Password != "" {
		opts.SetPassword(config.Password)
	}

	opts.SetCleanSession(config.CleanSession)
	opts.SetAutoReconnect(config.AutoReconnect)
	opts.SetConnectTimeout(config.ConnectTimeout)
	opts.SetKeepAlive(config.KeepAlive)

	// Configure TLS if enabled
	if config.UseTLS {
		tlsConfig := &tls.Config{
			InsecureSkipVerify: config.TLSSkipVerify,
		}
		opts.SetTLSConfig(tlsConfig)
	}

	// Connection lost handler
	opts.SetConnectionLostHandler(func(c mqtt.Client, err error) {
		logger.Error().Err(err).Msg("MQTT connection lost")
	})

	// On connect handler
	opts.SetOnConnectHandler(func(c mqtt.Client) {
		logger.Info().Msg("MQTT connected successfully")
	})

	// Reconnecting handler
	opts.SetReconnectingHandler(func(c mqtt.Client, opts *mqtt.ClientOptions) {
		logger.Info().Msg("MQTT attempting to reconnect")
	})

	client := mqtt.NewClient(opts)

	return &Client{
		client: client,
		logger: logger,
	}, nil
}

// Connect establishes connection to MQTT broker
func (c *Client) Connect() error {
	c.logger.Info().Msg("Connecting to MQTT broker...")

	token := c.client.Connect()
	if token.Wait() && token.Error() != nil {
		return fmt.Errorf("failed to connect to MQTT broker: %w", token.Error())
	}

	c.logger.Info().Msg("Successfully connected to MQTT broker")
	return nil
}

// Disconnect closes the connection to MQTT broker
func (c *Client) Disconnect() {
	c.logger.Info().Msg("Disconnecting from MQTT broker...")
	c.client.Disconnect(250)
	c.logger.Info().Msg("Disconnected from MQTT broker")
}

// Subscribe subscribes to a topic with a message handler
func (c *Client) Subscribe(topic string, qos byte, handler MessageHandler) error {
	c.logger.Info().Str("topic", topic).Msg("Subscribing to MQTT topic")

	callback := func(client mqtt.Client, msg mqtt.Message) {
		c.logger.Debug().
			Str("topic", msg.Topic()).
			Bytes("payload", msg.Payload()).
			Msg("Received MQTT message")

		if err := handler(msg.Topic(), msg.Payload()); err != nil {
			c.logger.Error().
				Err(err).
				Str("topic", msg.Topic()).
				Msg("Error handling MQTT message")
		}
	}

	token := c.client.Subscribe(topic, qos, callback)
	if token.Wait() && token.Error() != nil {
		return fmt.Errorf("failed to subscribe to topic %s: %w", topic, token.Error())
	}

	c.logger.Info().Str("topic", topic).Msg("Successfully subscribed to MQTT topic")
	return nil
}

// Unsubscribe unsubscribes from a topic
func (c *Client) Unsubscribe(topic string) error {
	c.logger.Info().Str("topic", topic).Msg("Unsubscribing from MQTT topic")

	token := c.client.Unsubscribe(topic)
	if token.Wait() && token.Error() != nil {
		return fmt.Errorf("failed to unsubscribe from topic %s: %w", topic, token.Error())
	}

	c.logger.Info().Str("topic", topic).Msg("Successfully unsubscribed from MQTT topic")
	return nil
}

// Publish publishes a message to a topic
func (c *Client) Publish(topic string, qos byte, retained bool, payload []byte) error {
	c.logger.Debug().
		Str("topic", topic).
		Bytes("payload", payload).
		Msg("Publishing MQTT message")

	token := c.client.Publish(topic, qos, retained, payload)
	if token.Wait() && token.Error() != nil {
		return fmt.Errorf("failed to publish to topic %s: %w", topic, token.Error())
	}

	return nil
}

// IsConnected returns whether the client is connected
func (c *Client) IsConnected() bool {
	return c.client.IsConnected()
}

// SubscribeToDeviceTelemetry subscribes to telemetry data from all devices
func (c *Client) SubscribeToDeviceTelemetry(handler MessageHandler) error {
	return c.Subscribe("devices/+/telemetry", 1, handler)
}

// SubscribeToDeviceEvents subscribes to events from all devices
func (c *Client) SubscribeToDeviceEvents(handler MessageHandler) error {
	return c.Subscribe("devices/+/events", 1, handler)
}

// SubscribeToSpecificDevice subscribes to a specific device's topics
func (c *Client) SubscribeToSpecificDevice(deviceID string, handler MessageHandler) error {
	telemetryTopic := fmt.Sprintf("devices/%s/telemetry", deviceID)
	if err := c.Subscribe(telemetryTopic, 1, handler); err != nil {
		return err
	}

	eventsTopic := fmt.Sprintf("devices/%s/events", deviceID)
	if err := c.Subscribe(eventsTopic, 1, handler); err != nil {
		return err
	}

	return nil
}

// UnsubscribeFromDevice unsubscribes from a specific device's topics
func (c *Client) UnsubscribeFromDevice(deviceID string) error {
	telemetryTopic := fmt.Sprintf("devices/%s/telemetry", deviceID)
	if err := c.Unsubscribe(telemetryTopic); err != nil {
		return err
	}

	eventsTopic := fmt.Sprintf("devices/%s/events", deviceID)
	if err := c.Unsubscribe(eventsTopic); err != nil {
		return err
	}

	return nil
}

// PublishCommand publishes a command to a specific device
func (c *Client) PublishCommand(deviceID string, command []byte) error {
	topic := fmt.Sprintf("devices/%s/commands", deviceID)
	return c.Publish(topic, 1, false, command)
}
