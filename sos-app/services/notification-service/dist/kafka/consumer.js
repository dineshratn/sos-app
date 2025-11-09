"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startKafkaConsumer = startKafkaConsumer;
exports.stopKafkaConsumer = stopKafkaConsumer;
exports.getConsumerStatus = getConsumerStatus;
const kafkajs_1 = require("kafkajs");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const notification_service_1 = require("../services/notification.service");
const escalation_service_1 = require("../services/escalation.service");
let consumer = null;
let isRunning = false;
/**
 * Initialize and start Kafka consumer
 */
async function startKafkaConsumer() {
    try {
        const kafka = new kafkajs_1.Kafka({
            clientId: config_1.config.kafka.clientId,
            brokers: config_1.config.kafka.brokers,
            retry: {
                initialRetryTime: 100,
                retries: 8,
            },
        });
        consumer = kafka.consumer({
            groupId: config_1.config.kafka.groupId,
            sessionTimeout: 30000,
            heartbeatInterval: 3000,
        });
        await consumer.connect();
        logger_1.logger.info('Kafka consumer connected', {
            groupId: config_1.config.kafka.groupId,
            brokers: config_1.config.kafka.brokers,
        });
        // Subscribe to topics
        await consumer.subscribe({
            topics: [
                config_1.config.kafka.topics.emergencyCreated,
                config_1.config.kafka.topics.escalation,
            ],
            fromBeginning: false,
        });
        logger_1.logger.info('Subscribed to Kafka topics', {
            topics: [
                config_1.config.kafka.topics.emergencyCreated,
                config_1.config.kafka.topics.escalation,
            ],
        });
        // Start consuming messages
        isRunning = true;
        await consumer.run({
            autoCommit: true,
            autoCommitInterval: 5000,
            eachMessage: handleMessage,
        });
        logger_1.logger.info('Kafka consumer started successfully');
    }
    catch (error) {
        logger_1.logger.warn('Kafka connection failed, continuing without Kafka event consumption', {
            error: error.message,
        });
        // Don't throw - allow service to continue without Kafka
    }
}
/**
 * Handle incoming Kafka messages
 */
async function handleMessage(payload) {
    const { topic, partition, message } = payload;
    try {
        const value = message.value?.toString();
        if (!value) {
            logger_1.logger.warn('Received empty message', { topic, partition });
            return;
        }
        const data = JSON.parse(value);
        logger_1.logger.info('Processing Kafka message', {
            topic,
            partition,
            offset: message.offset,
            key: message.key?.toString(),
        });
        switch (topic) {
            case config_1.config.kafka.topics.emergencyCreated:
                await handleEmergencyCreated(data);
                break;
            case config_1.config.kafka.topics.escalation:
                await handleEmergencyEscalation(data);
                break;
            default:
                logger_1.logger.warn('Unknown topic', { topic });
        }
    }
    catch (error) {
        logger_1.logger.error('Error processing Kafka message', {
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
async function handleEmergencyCreated(data) {
    try {
        const emergency = {
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
        logger_1.logger.info('Handling emergency created event', {
            emergencyId: emergency.id,
            userId: emergency.userId,
            contactCount: emergency.contacts.length,
        });
        // Dispatch notifications to all emergency contacts
        await (0, notification_service_1.dispatchEmergencyAlert)(emergency, emergency.contacts);
        logger_1.logger.info('Emergency notifications dispatched', {
            emergencyId: emergency.id,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to handle emergency created event', {
            error: error.message,
            data,
        });
        throw error;
    }
}
/**
 * Handle emergency escalation event
 */
async function handleEmergencyEscalation(data) {
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
        logger_1.logger.info('Handling emergency escalation event', {
            emergencyId: escalationData.emergencyId,
            contactCount: escalationData.secondaryContacts.length,
            reason: escalationData.escalationReason,
        });
        // Handle escalation to secondary contacts
        await (0, escalation_service_1.handleEscalation)(escalationData);
        logger_1.logger.info('Emergency escalation handled', {
            emergencyId: escalationData.emergencyId,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to handle emergency escalation event', {
            error: error.message,
            data,
        });
        throw error;
    }
}
/**
 * Stop Kafka consumer gracefully
 */
async function stopKafkaConsumer() {
    if (consumer && isRunning) {
        try {
            isRunning = false;
            await consumer.disconnect();
            logger_1.logger.info('Kafka consumer disconnected');
        }
        catch (error) {
            logger_1.logger.error('Error disconnecting Kafka consumer', {
                error: error.message,
            });
        }
    }
}
/**
 * Get consumer status
 */
function getConsumerStatus() {
    return {
        connected: consumer !== null,
        running: isRunning,
    };
}
// Graceful shutdown
process.on('SIGTERM', stopKafkaConsumer);
process.on('SIGINT', stopKafkaConsumer);
//# sourceMappingURL=consumer.js.map