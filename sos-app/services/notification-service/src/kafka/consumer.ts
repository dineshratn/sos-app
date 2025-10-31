import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Emergency } from '../models/Notification';
import { dispatchEmergencyAlert } from '../services/notification.service';
import { handleEscalation } from '../services/escalation.service';

let consumer: Consumer | null = null;
let isRunning = false;

/**
 * Initialize and start Kafka consumer
 */
export async function startKafkaConsumer(): Promise<void> {
  try {
    const kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    consumer = kafka.consumer({
      groupId: config.kafka.groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    await consumer.connect();
    logger.info('Kafka consumer connected', {
      groupId: config.kafka.groupId,
      brokers: config.kafka.brokers,
    });

    // Subscribe to topics
    await consumer.subscribe({
      topics: [
        config.kafka.topics.emergencyCreated,
        config.kafka.topics.escalation,
      ],
      fromBeginning: false,
    });

    logger.info('Subscribed to Kafka topics', {
      topics: [
        config.kafka.topics.emergencyCreated,
        config.kafka.topics.escalation,
      ],
    });

    // Start consuming messages
    isRunning = true;
    await consumer.run({
      autoCommit: true,
      autoCommitInterval: 5000,
      eachMessage: handleMessage,
    });

    logger.info('Kafka consumer started successfully');
  } catch (error: any) {
    logger.error('Failed to start Kafka consumer', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Handle incoming Kafka messages
 */
async function handleMessage(payload: EachMessagePayload): Promise<void> {
  const { topic, partition, message } = payload;

  try {
    const value = message.value?.toString();
    if (!value) {
      logger.warn('Received empty message', { topic, partition });
      return;
    }

    const data = JSON.parse(value);

    logger.info('Processing Kafka message', {
      topic,
      partition,
      offset: message.offset,
      key: message.key?.toString(),
    });

    switch (topic) {
      case config.kafka.topics.emergencyCreated:
        await handleEmergencyCreated(data);
        break;

      case config.kafka.topics.escalation:
        await handleEmergencyEscalation(data);
        break;

      default:
        logger.warn('Unknown topic', { topic });
    }
  } catch (error: any) {
    logger.error('Error processing Kafka message', {
      topic,
      partition,
      offset: message.offset,
      error: error.message,
      stack: error.stack,
    });

    // Don't throw - let the consumer continue processing other messages
    // Failed messages will be logged for manual review
  }
}

/**
 * Handle emergency created event
 */
async function handleEmergencyCreated(data: any): Promise<void> {
  try {
    const emergency: Emergency = {
      id: data.emergencyId || data.id,
      userId: data.userId,
      userName: data.userName || 'Unknown User',
      emergencyType: data.emergencyType || data.type || 'GENERAL',
      status: data.status,
      location: {
        latitude: data.location?.latitude || data.location?.lat || 0,
        longitude: data.location?.longitude || data.location?.lng || 0,
        address: data.location?.address,
      },
      initialMessage: data.initialMessage || data.message,
      contacts: data.contacts || [],
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    };

    logger.info('Handling emergency created event', {
      emergencyId: emergency.id,
      userId: emergency.userId,
      contactCount: emergency.contacts.length,
    });

    // Dispatch notifications to all emergency contacts
    await dispatchEmergencyAlert(emergency, emergency.contacts);

    logger.info('Emergency notifications dispatched', {
      emergencyId: emergency.id,
    });
  } catch (error: any) {
    logger.error('Failed to handle emergency created event', {
      error: error.message,
      data,
    });
    throw error;
  }
}

/**
 * Handle emergency escalation event
 */
async function handleEmergencyEscalation(data: any): Promise<void> {
  try {
    const escalationData = {
      emergencyId: data.emergencyId || data.id,
      userId: data.userId,
      userName: data.userName || 'Unknown User',
      emergencyType: data.emergencyType || data.type || 'GENERAL',
      location: {
        latitude: data.location?.latitude || data.location?.lat || 0,
        longitude: data.location?.longitude || data.location?.lng || 0,
        address: data.location?.address,
      },
      secondaryContacts: data.secondaryContacts || [],
      escalationReason: data.reason || 'Primary contacts did not acknowledge',
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
    };

    logger.info('Handling emergency escalation event', {
      emergencyId: escalationData.emergencyId,
      contactCount: escalationData.secondaryContacts.length,
      reason: escalationData.escalationReason,
    });

    // Handle escalation to secondary contacts
    await handleEscalation(escalationData);

    logger.info('Emergency escalation handled', {
      emergencyId: escalationData.emergencyId,
    });
  } catch (error: any) {
    logger.error('Failed to handle emergency escalation event', {
      error: error.message,
      data,
    });
    throw error;
  }
}

/**
 * Stop Kafka consumer gracefully
 */
export async function stopKafkaConsumer(): Promise<void> {
  if (consumer && isRunning) {
    try {
      isRunning = false;
      await consumer.disconnect();
      logger.info('Kafka consumer disconnected');
    } catch (error: any) {
      logger.error('Error disconnecting Kafka consumer', {
        error: error.message,
      });
    }
  }
}

/**
 * Get consumer status
 */
export function getConsumerStatus(): { connected: boolean; running: boolean } {
  return {
    connected: consumer !== null,
    running: isRunning,
  };
}

// Graceful shutdown
process.on('SIGTERM', stopKafkaConsumer);
process.on('SIGINT', stopKafkaConsumer);
