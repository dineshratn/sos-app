"use strict";
/**
 * Kafka Service
 * Handles Kafka producer for publishing communication events
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaService = void 0;
const kafkajs_1 = require("kafkajs");
const logger_1 = __importDefault(require("../utils/logger"));
class KafkaService {
    constructor() {
        this.producer = null;
        this.isConnected = false;
        const brokers = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
        const clientId = process.env.KAFKA_CLIENT_ID || 'communication-service';
        this.kafka = new kafkajs_1.Kafka({
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
    async connect() {
        if (this.isConnected || !this.producer) {
            logger_1.default.info('Kafka: Already connected or producer not initialized');
            return;
        }
        try {
            await this.producer.connect();
            this.isConnected = true;
            logger_1.default.info('Kafka producer connected successfully');
        }
        catch (error) {
            logger_1.default.error('Failed to connect Kafka producer:', error);
            throw error;
        }
    }
    async disconnect() {
        if (!this.isConnected || !this.producer) {
            return;
        }
        try {
            await this.producer.disconnect();
            this.isConnected = false;
            logger_1.default.info('Kafka producer disconnected successfully');
        }
        catch (error) {
            logger_1.default.error('Error disconnecting Kafka producer:', error);
            throw error;
        }
    }
    async publishEvent(topic, event) {
        if (!this.isConnected || !this.producer) {
            logger_1.default.warn('Kafka producer not connected, skipping event publish');
            return;
        }
        try {
            const record = {
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
            logger_1.default.info(`Event published to Kafka topic ${topic}:`, event.eventType);
        }
        catch (error) {
            logger_1.default.error('Error publishing event to Kafka:', error);
            // Don't throw - we don't want to fail message sending if Kafka is down
        }
    }
    async publishMessageSentEvent(event) {
        const kafkaEvent = {
            eventType: 'MessageSent',
            ...event,
            timestamp: new Date()
        };
        await this.publishEvent('communication.message.sent', kafkaEvent);
    }
    async publishMessageDeliveredEvent(event) {
        const kafkaEvent = {
            eventType: 'MessageDelivered',
            ...event,
            timestamp: new Date()
        };
        await this.publishEvent('communication.message.delivered', kafkaEvent);
    }
    async publishMessageReadEvent(event) {
        const kafkaEvent = {
            eventType: 'MessageRead',
            ...event,
            timestamp: new Date()
        };
        await this.publishEvent('communication.message.read', kafkaEvent);
    }
    isConnectedStatus() {
        return this.isConnected;
    }
}
exports.KafkaService = KafkaService;
exports.default = new KafkaService();
//# sourceMappingURL=kafka.service.js.map