"use strict";
/**
 * Message Routes
 * Task 129: GET message history endpoint with pagination
 * Task 135: POST offline sync endpoint
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const joi_1 = __importDefault(require("joi"));
const message_schema_1 = __importDefault(require("../db/schemas/message.schema"));
const auth_http_middleware_1 = require("../middleware/auth.http.middleware");
const Message_1 = require("../models/Message");
const logger_1 = __importDefault(require("../utils/logger"));
const kafka_service_1 = __importDefault(require("../services/kafka.service"));
const router = (0, express_1.Router)();
// Validation schema for message history query
const messageHistorySchema = joi_1.default.object({
    limit: joi_1.default.number().integer().min(1).max(100).default(50),
    offset: joi_1.default.number().integer().min(0).default(0),
    before: joi_1.default.date().iso().optional(),
    after: joi_1.default.date().iso().optional()
});
// Validation schema for offline sync
const offlineSyncSchema = joi_1.default.object({
    emergencyId: joi_1.default.string().required(),
    messages: joi_1.default.array()
        .items(joi_1.default.object({
        senderId: joi_1.default.string().required(),
        type: joi_1.default.string()
            .valid(...Object.values(Message_1.MessageType))
            .required(),
        content: joi_1.default.string().required().max(10000),
        metadata: joi_1.default.object().optional(),
        senderRole: joi_1.default.string()
            .valid(...Object.values(Message_1.SenderRole))
            .optional()
    }))
        .required()
});
/**
 * GET /api/v1/messages/:emergencyId
 * Retrieve message history for an emergency with pagination
 */
router.get('/:emergencyId', auth_http_middleware_1.authenticateHTTP, async (req, res) => {
    try {
        const { emergencyId } = req.params;
        // Validate query parameters
        const { error, value } = messageHistorySchema.validate(req.query);
        if (error) {
            logger_1.default.warn(`Message history validation failed:`, error.details);
            return res.status(400).json({
                success: false,
                error: `Validation error: ${error.details[0].message}`
            });
        }
        const { limit, offset, before, after } = value;
        // Build query options
        const queryOptions = {
            limit,
            offset
        };
        if (before) {
            queryOptions.before = new Date(before);
        }
        if (after) {
            queryOptions.after = new Date(after);
        }
        // TODO: In production, verify user has access to this emergency room
        // await authorizeEmergencyAccess(req.userId, emergencyId, req.userRole);
        // Fetch messages from MongoDB
        const messages = await message_schema_1.default.findByEmergencyWithPagination(emergencyId, queryOptions);
        // Get total count for pagination
        const total = await message_schema_1.default.countByEmergency(emergencyId);
        const hasMore = offset + limit < total;
        logger_1.default.info(`Retrieved ${messages.length} messages for emergency ${emergencyId} ` +
            `(offset: ${offset}, limit: ${limit}, total: ${total})`);
        const response = {
            success: true,
            messages,
            total,
            hasMore
        };
        return res.status(200).json(response);
    }
    catch (error) {
        logger_1.default.error('Error retrieving message history:', error);
        return res.status(500).json({
            success: false,
            messages: [],
            total: 0,
            hasMore: false,
            error: 'An error occurred while retrieving messages'
        });
    }
});
/**
 * POST /api/v1/messages/sync
 * Sync offline messages (batch upload)
 */
router.post('/sync', auth_http_middleware_1.authenticateHTTP, async (req, res) => {
    try {
        // Validate request body
        const { error, value } = offlineSyncSchema.validate(req.body);
        if (error) {
            logger_1.default.warn(`Offline sync validation failed:`, error.details);
            return res.status(400).json({
                success: false,
                syncedMessages: [],
                failedMessages: [],
                error: `Validation error: ${error.details[0].message}`
            });
        }
        const { emergencyId, messages } = value;
        // TODO: Verify user has access to this emergency room
        // await authorizeEmergencyAccess(req.userId, emergencyId, req.userRole);
        const syncedMessages = [];
        const failedMessages = [];
        // Process each message
        for (let i = 0; i < messages.length; i++) {
            try {
                const msgData = messages[i];
                // Verify sender matches authenticated user
                if (msgData.senderId !== req.userId) {
                    logger_1.default.warn(`Offline sync: Sender mismatch for message ${i}`);
                    failedMessages.push(`Message ${i}: Sender ID mismatch`);
                    continue;
                }
                // Create and save message
                const messageDoc = new message_schema_1.default({
                    emergencyId,
                    senderId: msgData.senderId,
                    senderRole: msgData.senderRole || Message_1.SenderRole.USER,
                    type: msgData.type,
                    content: msgData.content,
                    metadata: msgData.metadata || {},
                    status: 'SENT',
                    deliveredTo: [],
                    readBy: []
                });
                const savedMessage = await messageDoc.save();
                const message = savedMessage.toJSON();
                syncedMessages.push(message);
                // Publish to Kafka
                await kafka_service_1.default.publishMessageSentEvent({
                    emergencyId,
                    messageId: message.id,
                    senderId: msgData.senderId,
                    messageType: msgData.type
                });
                logger_1.default.info(`Offline message synced: ${message.id} for emergency ${emergencyId}`);
            }
            catch (msgError) {
                logger_1.default.error(`Error syncing message ${i}:`, msgError);
                failedMessages.push(`Message ${i}: ${msgError instanceof Error ? msgError.message : 'Unknown error'}`);
            }
        }
        logger_1.default.info(`Offline sync completed for emergency ${emergencyId}: ` +
            `${syncedMessages.length} synced, ${failedMessages.length} failed`);
        const response = {
            success: true,
            syncedMessages,
            failedMessages
        };
        return res.status(200).json(response);
    }
    catch (error) {
        logger_1.default.error('Error syncing offline messages:', error);
        return res.status(500).json({
            success: false,
            syncedMessages: [],
            failedMessages: [],
            error: 'An error occurred while syncing messages'
        });
    }
});
exports.default = router;
//# sourceMappingURL=message.routes.js.map