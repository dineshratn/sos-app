"use strict";
/**
 * Message Handler
 * Task 128: Handle sending/receiving messages with validation, persistence, and Kafka events
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageHandler = void 0;
const joi_1 = __importDefault(require("joi"));
const message_schema_1 = __importDefault(require("../../db/schemas/message.schema"));
const kafka_service_1 = __importDefault(require("../../services/kafka.service"));
const Message_1 = require("../../models/Message");
const logger_1 = __importDefault(require("../../utils/logger"));
class MessageHandler {
    constructor(io) {
        // Validation schema for send message
        this.sendMessageSchema = joi_1.default.object({
            emergencyId: joi_1.default.string().required(),
            senderId: joi_1.default.string().required(),
            type: joi_1.default.string()
                .valid(...Object.values(Message_1.MessageType))
                .required(),
            content: joi_1.default.string().required().max(10000),
            metadata: joi_1.default.object().optional()
        });
        this.io = io;
    }
    /**
     * Handle sending a new message
     * Validates, saves to MongoDB, broadcasts to room, and publishes to Kafka
     */
    async handleSendMessage(socket, data, callback) {
        try {
            // Validate input
            const { error, value } = this.sendMessageSchema.validate(data);
            if (error) {
                logger_1.default.warn(`Message validation failed from socket ${socket.id}:`, error.details);
                return callback({
                    success: false,
                    error: `Validation error: ${error.details[0].message}`
                });
            }
            const { emergencyId, senderId, type, content, metadata } = value;
            // Verify user is authenticated and matches senderId
            if (socket.userId !== senderId) {
                logger_1.default.warn(`Send message failed: User ID mismatch. Socket user: ${socket.userId}, Request sender: ${senderId}`);
                return callback({
                    success: false,
                    error: 'Unauthorized: User ID mismatch'
                });
            }
            // Determine sender role from socket
            const senderRole = this.determineSenderRole(socket.userRole);
            // Create message document
            const messageDoc = new message_schema_1.default({
                emergencyId,
                senderId,
                senderRole,
                type,
                content,
                metadata: metadata || {},
                status: 'SENT',
                deliveredTo: [],
                readBy: []
            });
            // Save to MongoDB
            const savedMessage = await messageDoc.save();
            // Convert to plain object for response
            const message = savedMessage.toJSON();
            logger_1.default.info(`Message ${message.id} sent by ${senderId} to emergency ${emergencyId} (type: ${type})`);
            // Broadcast message to all users in the emergency room
            const messageEvent = {
                event: 'message:new',
                emergencyId,
                message,
                timestamp: new Date()
            };
            // Broadcast to room (including sender)
            this.io.to(emergencyId).emit('message:new', messageEvent);
            // Publish event to Kafka
            await kafka_service_1.default.publishMessageSentEvent({
                emergencyId,
                messageId: message.id,
                senderId,
                messageType: type
            });
            // Send success response
            callback({
                success: true,
                message
            });
        }
        catch (error) {
            logger_1.default.error('Error in handleSendMessage:', error);
            callback({
                success: false,
                error: 'An error occurred while sending the message. Please try again.'
            });
        }
    }
    /**
     * Handle editing a message
     */
    async handleEditMessage(socket, data, callback) {
        try {
            const { messageId, content, emergencyId } = data;
            // Validate
            if (!messageId || !content || !emergencyId) {
                return callback({
                    success: false,
                    error: 'Missing required fields'
                });
            }
            // Find message
            const messageDoc = await message_schema_1.default.findById(messageId);
            if (!messageDoc) {
                return callback({
                    success: false,
                    error: 'Message not found'
                });
            }
            // Verify ownership
            if (messageDoc.senderId !== socket.userId) {
                return callback({
                    success: false,
                    error: 'Unauthorized: You can only edit your own messages'
                });
            }
            // Update message
            messageDoc.content = content;
            messageDoc.metadata = {
                ...messageDoc.metadata,
                isEdited: true,
                editedAt: new Date()
            };
            messageDoc.updatedAt = new Date();
            await messageDoc.save();
            const message = messageDoc.toJSON();
            // Broadcast update
            const messageEvent = {
                event: 'message:updated',
                emergencyId,
                message,
                timestamp: new Date()
            };
            this.io.to(emergencyId).emit('message:updated', messageEvent);
            logger_1.default.info(`Message ${messageId} edited by ${socket.userId}`);
            callback({
                success: true,
                message
            });
        }
        catch (error) {
            logger_1.default.error('Error in handleEditMessage:', error);
            callback({
                success: false,
                error: 'An error occurred while editing the message'
            });
        }
    }
    /**
     * Handle deleting a message
     */
    async handleDeleteMessage(socket, data, callback) {
        try {
            const { messageId, emergencyId } = data;
            // Find message
            const messageDoc = await message_schema_1.default.findById(messageId);
            if (!messageDoc) {
                return callback({
                    success: false,
                    error: 'Message not found'
                });
            }
            // Verify ownership or admin role
            if (messageDoc.senderId !== socket.userId && socket.userRole !== 'ADMIN') {
                return callback({
                    success: false,
                    error: 'Unauthorized: You can only delete your own messages'
                });
            }
            // Soft delete by marking content
            messageDoc.content = '[Message deleted]';
            messageDoc.metadata = {
                ...messageDoc.metadata,
                isEdited: true,
                editedAt: new Date()
            };
            await messageDoc.save();
            const message = messageDoc.toJSON();
            // Broadcast deletion
            const messageEvent = {
                event: 'message:deleted',
                emergencyId,
                message,
                timestamp: new Date()
            };
            this.io.to(emergencyId).emit('message:deleted', messageEvent);
            logger_1.default.info(`Message ${messageId} deleted by ${socket.userId}`);
            callback({ success: true });
        }
        catch (error) {
            logger_1.default.error('Error in handleDeleteMessage:', error);
            callback({
                success: false,
                error: 'An error occurred while deleting the message'
            });
        }
    }
    /**
     * Determine sender role from user role
     */
    determineSenderRole(userRole) {
        switch (userRole) {
            case 'ADMIN':
                return Message_1.SenderRole.ADMIN;
            case 'RESPONDER':
                return Message_1.SenderRole.RESPONDER;
            case 'CONTACT':
                return Message_1.SenderRole.CONTACT;
            default:
                return Message_1.SenderRole.USER;
        }
    }
    /**
     * Register all message-related event handlers
     */
    registerHandlers(socket) {
        // Send message handler
        socket.on('message:send', (data, callback) => {
            this.handleSendMessage(socket, data, callback);
        });
        // Edit message handler
        socket.on('message:edit', (data, callback) => {
            this.handleEditMessage(socket, data, callback);
        });
        // Delete message handler
        socket.on('message:delete', (data, callback) => {
            this.handleDeleteMessage(socket, data, callback);
        });
        logger_1.default.info(`Message handlers registered for socket ${socket.id}`);
    }
}
exports.MessageHandler = MessageHandler;
//# sourceMappingURL=message.handler.js.map