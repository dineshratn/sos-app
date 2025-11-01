import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import config from '../config';
import logger from '../utils/logger';

let producer: Producer;
let kafka: Kafka;

/**
 * Initialize Kafka producer
 */
export const initializeKafkaProducer = async (): Promise<void> => {
  try {
    kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    producer = kafka.producer({
      allowAutoTopicCreation: false,
      transactionTimeout: 30000,
    });

    await producer.connect();

    logger.info('Kafka producer connected successfully', {
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
    });

    // Handle producer errors
    producer.on('producer.disconnect', () => {
      logger.warn('Kafka producer disconnected');
    });

  } catch (error) {
    logger.error('Failed to initialize Kafka producer', { error });
    // Don't throw - allow service to start without Kafka for development
    logger.warn('Service running without Kafka producer');
  }
};

/**
 * Publish message to Kafka topic
 */
export const publishEvent = async (
  topic: string,
  key: string,
  value: any
): Promise<void> => {
  if (!producer) {
    logger.warn('Kafka producer not initialized, skipping event', { topic, key });
    return;
  }

  try {
    const message: ProducerRecord = {
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(value),
          timestamp: Date.now().toString(),
        },
      ],
    };

    await producer.send(message);

    logger.debug('Event published to Kafka', {
      topic,
      key,
      eventType: value.eventType,
    });

  } catch (error) {
    logger.error('Failed to publish event to Kafka', {
      topic,
      key,
      error,
    });
    // Don't throw - message is already saved to MongoDB
  }
};

/**
 * Publish MessageSent event
 */
export const publishMessageSentEvent = async (message: any): Promise<void> => {
  await publishEvent('communication-events', message.emergencyId, {
    eventType: 'MessageSent',
    emergencyId: message.emergencyId,
    messageId: message._id.toString(),
    senderId: message.senderId,
    senderRole: message.senderRole,
    type: message.type,
    content: message.content.substring(0, 100), // Truncate for event
    timestamp: new Date().toISOString(),
  });
};

/**
 * Publish MessageDelivered event
 */
export const publishMessageDeliveredEvent = async (
  messageId: string,
  emergencyId: string,
  userId: string
): Promise<void> => {
  await publishEvent('communication-events', emergencyId, {
    eventType: 'MessageDelivered',
    emergencyId,
    messageId,
    userId,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Publish MessageRead event
 */
export const publishMessageReadEvent = async (
  messageId: string,
  emergencyId: string,
  userId: string
): Promise<void> => {
  await publishEvent('communication-events', emergencyId, {
    eventType: 'MessageRead',
    emergencyId,
    messageId,
    userId,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Disconnect Kafka producer
 */
export const disconnectKafkaProducer = async (): Promise<void> => {
  if (producer) {
    try {
      await producer.disconnect();
      logger.info('Kafka producer disconnected');
    } catch (error) {
      logger.error('Error disconnecting Kafka producer', { error });
    }
  }
};

export default {
  initializeKafkaProducer,
  publishEvent,
  publishMessageSentEvent,
  publishMessageDeliveredEvent,
  publishMessageReadEvent,
  disconnectKafkaProducer,
};
