"use strict";
/**
 * Receipt Handler
 * Task 134: Handle message:delivered and message:read events
 * Updates message status in MongoDB and publishes to Kafka
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptHandler = void 0;
const joi_1 = __importDefault(require("joi"));
const message_schema_1 = __importDefault(require("../../db/schemas/message.schema"));
const kafka_service_1 = __importDefault(require("../../services/kafka.service"));
const logger_1 = __importDefault(require("../../utils/logger"));
class ReceiptHandler {
    constructor(io) {
        // Validation schema for receipt
        this.receiptSchema = joi_1.default.object({
            emergencyId: joi_1.default.string().required(),
            messageId: joi_1.default.string().required(),
            userId: joi_1.default.string().required(),
            status: joi_1.default.string().valid('delivered', 'read').required()
        });
        this.io = io;
    }
    /**
     * Handle message:delivered event
     * Marks message as delivered to a specific user
     */
    async handleMessageDelivered(socket, data) {
        try {
            // Validate input
            const { error, value } = this.receiptSchema.validate({
                ...data,
                status: 'delivered'
            });
            if (error) {
                logger_1.default.warn(`Delivery receipt validation failed from socket ${socket.id}:`, error.details);
                return;
            }
            const { emergencyId, messageId, userId } = value;
            // Verify user is authenticated and matches userId
            if (socket.userId !== userId) {
                logger_1.default.warn(`Delivery receipt failed: User ID mismatch. Socket user: ${socket.userId}, Request user: ${userId}`);
                return;
            }
            // Update message in database
            const updatedMessage = await message_schema_1.default.markAsDelivered(messageId, userId);
            if (!updatedMessage) {
                logger_1.default.warn(`Message not found for delivery receipt: ${messageId}`);
                return;
            }
            logger_1.default.info(`Message ${messageId} marked as delivered to user ${userId}`);
            // Broadcast delivery receipt to sender and other participants
            this.io.to(emergencyId).emit('message:delivered', {
                messageId,
                userId,
                timestamp: new Date()
            });
            // Publish to Kafka
            await kafka_service_1.default.publishMessageDeliveredEvent({
                emergencyId,
                messageId,
                userId
            });
        }
        catch (error) {
            logger_1.default.error('Error in handleMessageDelivered:', error);
        }
    }
    /**
     * Handle message:read event
     * Marks message as read by a specific user
     */
    async handleMessageRead(socket, data) {
        try {
            // Validate input
            const { error, value } = this.receiptSchema.validate({
                ...data,
                status: 'read'
            });
            if (error) {
                logger_1.default.warn(`Read receipt validation failed from socket ${socket.id}:`, error.details);
                return;
            }
            const { emergencyId, messageId, userId } = value;
            // Verify user is authenticated and matches userId
            if (socket.userId !== userId) {
                logger_1.default.warn(`Read receipt failed: User ID mismatch. Socket user: ${socket.userId}, Request user: ${userId}`);
                return;
            }
            // Update message in database
            const updatedMessage = await message_schema_1.default.markAsRead(messageId, userId);
            if (!updatedMessage) {
                logger_1.default.warn(`Message not found for read receipt: ${messageId}`);
                return;
            }
            logger_1.default.info(`Message ${messageId} marked as read by user ${userId}`);
            // Broadcast read receipt to sender and other participants
            this.io.to(emergencyId).emit('message:read', {
                messageId,
                userId,
                timestamp: new Date()
            });
            // Publish to Kafka
            await kafka_service_1.default.publishMessageReadEvent({
                emergencyId,
                messageId,
                userId
            });
        }
        catch (error) {
            logger_1.default.error('Error in handleMessageRead:', error);
        }
    }
    /**
     * Handle batch delivery receipts
     * Marks multiple messages as delivered at once
     */
    async handleBatchDelivered(socket, data) {
        try {
            const { emergencyId, messageIds, userId } = data;
            if (!emergencyId || !messageIds || !userId || !Array.isArray(messageIds)) {
                logger_1.default.warn(`Batch delivery receipt: Invalid data from socket ${socket.id}`);
                return;
            }
            // Verify user is authenticated and matches userId
            if (socket.userId !== userId) {
                logger_1.default.warn(`Batch delivery receipt failed: User ID mismatch. Socket user: ${socket.userId}, Request user: ${userId}`);
                return;
            }
            // Process each message
            for (const messageId of messageIds) {
                await this.handleMessageDelivered(socket, {
                    emergencyId,
                    messageId,
                    userId,
                    status: 'delivered'
                });
            }
            logger_1.default.info(`Batch delivery receipt: ${messageIds.length} messages marked as delivered to user ${userId}`);
        }
        catch (error) {
            logger_1.default.error('Error in handleBatchDelivered:', error);
        }
    }
    /**
     * Handle batch read receipts
     * Marks multiple messages as read at once
     */
    async handleBatchRead(socket, data) {
        try {
            const { emergencyId, messageIds, userId } = data;
            if (!emergencyId || !messageIds || !userId || !Array.isArray(messageIds)) {
                logger_1.default.warn(`Batch read receipt: Invalid data from socket ${socket.id}`);
                return;
            }
            // Verify user is authenticated and matches userId
            if (socket.userId !== userId) {
                logger_1.default.warn(`Batch read receipt failed: User ID mismatch. Socket user: ${socket.userId}, Request user: ${userId}`);
                return;
            }
            // Process each message
            for (const messageId of messageIds) {
                await this.handleMessageRead(socket, {
                    emergencyId,
                    messageId,
                    userId,
                    status: 'read'
                });
            }
            logger_1.default.info(`Batch read receipt: ${messageIds.length} messages marked as read by user ${userId}`);
        }
        catch (error) {
            logger_1.default.error('Error in handleBatchRead:', error);
        }
    }
    /**
     * Register all receipt-related event handlers
     */
    registerHandlers(socket) {
        // Single message delivery receipt
        socket.on('message:delivered', (data) => {
            this.handleMessageDelivered(socket, data);
        });
        // Single message read receipt
        socket.on('message:read', (data) => {
            this.handleMessageRead(socket, data);
        });
        // Batch delivery receipts
        socket.on('message:batch-delivered', (data) => {
            this.handleBatchDelivered(socket, data);
        });
        // Batch read receipts
        socket.on('message:batch-read', (data) => {
            this.handleBatchRead(socket, data);
        });
        logger_1.default.info(`Receipt handlers registered for socket ${socket.id}`);
    }
}
exports.ReceiptHandler = ReceiptHandler;
//# sourceMappingURL=receipt.handler.js.map