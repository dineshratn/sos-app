/**
 * Kafka Service
 * Handles Kafka producer for publishing communication events
 */

import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import logger from '../utils/logger';

export class KafkaService {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private isConnected: boolean = false;

  constructor() {
    const brokers = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
    const clientId = process.env.KAFKA_CLIENT_ID || 'communication-service';

    this.kafka = new Kafka({
      clientId,
      brokers,
      retry: {
        retries: 5,
        initialRetryTime: 100,
        maxRetryTime: 30000
      }
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: false,
      transactionTimeout: 30000
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected || !this.producer) {
      logger.info('Kafka: Already connected or producer not initialized');
      return;
    }

    try {
      await this.producer.connect();
      this.isConnected = true;
      logger.info('Kafka producer connected successfully');
    } catch (error) {
      logger.error('Failed to connect Kafka producer:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected || !this.producer) {
      return;
    }

    try {
      await this.producer.disconnect();
      this.isConnected = false;
      logger.info('Kafka producer disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting Kafka producer:', error);
      throw error;
    }
  }

  async publishEvent(topic: string, event: any): Promise<void> {
    if (!this.isConnected || !this.producer) {
      logger.warn('Kafka producer not connected, skipping event publish');
      return;
    }

    try {
      const record: ProducerRecord = {
        topic,
        messages: [
          {
            key: event.emergencyId || event.messageId || Date.now().toString(),
            value: JSON.stringify(event),
            timestamp: Date.now().toString()
          }
        ]
      };

      await this.producer.send(record);
      logger.info(`Event published to Kafka topic ${topic}:`, event.eventType);
    } catch (error) {
      logger.error('Error publishing event to Kafka:', error);
      // Don't throw - we don't want to fail message sending if Kafka is down
    }
  }

  async publishMessageSentEvent(event: {
    emergencyId: string;
    messageId: string;
    senderId: string;
    messageType: string;
  }): Promise<void> {
    const kafkaEvent = {
      eventType: 'MessageSent',
      ...event,
      timestamp: new Date()
    };

    await this.publishEvent('communication.message.sent', kafkaEvent);
  }

  async publishMessageDeliveredEvent(event: {
    emergencyId: string;
    messageId: string;
    userId: string;
  }): Promise<void> {
    const kafkaEvent = {
      eventType: 'MessageDelivered',
      ...event,
      timestamp: new Date()
    };

    await this.publishEvent('communication.message.delivered', kafkaEvent);
  }

  async publishMessageReadEvent(event: {
    emergencyId: string;
    messageId: string;
    userId: string;
  }): Promise<void> {
    const kafkaEvent = {
      eventType: 'MessageRead',
      ...event,
      timestamp: new Date()
    };

    await this.publishEvent('communication.message.read', kafkaEvent);
  }

  isConnectedStatus(): boolean {
    return this.isConnected;
  }
}

export default new KafkaService();
