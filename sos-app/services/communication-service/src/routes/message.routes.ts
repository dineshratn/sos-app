/**
 * Message Routes
 * Task 129: GET message history endpoint with pagination
 * Task 135: POST offline sync endpoint
 */

import { Router } from 'express';
import Joi from 'joi';
import MessageModel from '../db/schemas/message.schema';
import { authenticateHTTP, AuthenticatedRequest } from '../middleware/auth.http.middleware';
import {
  MessageHistoryResponse,
  OfflineSyncRequest,
  OfflineSyncResponse,
  MessageType,
  SenderRole
} from '../models/Message';
import logger from '../utils/logger';
import kafkaService from '../services/kafka.service';

const router = Router();

// Validation schema for message history query
const messageHistorySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
  before: Joi.date().iso().optional(),
  after: Joi.date().iso().optional()
});

// Validation schema for offline sync
const offlineSyncSchema = Joi.object({
  emergencyId: Joi.string().required(),
  messages: Joi.array()
    .items(
      Joi.object({
        senderId: Joi.string().required(),
        type: Joi.string()
          .valid(...Object.values(MessageType))
          .required(),
        content: Joi.string().required().max(10000),
        metadata: Joi.object().optional(),
        senderRole: Joi.string()
          .valid(...Object.values(SenderRole))
          .optional()
      })
    )
    .required()
});

/**
 * GET /api/v1/messages/:emergencyId
 * Retrieve message history for an emergency with pagination
 */
router.get(
  '/:emergencyId',
  authenticateHTTP,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { emergencyId } = req.params;

      // Validate query parameters
      const { error, value } = messageHistorySchema.validate(req.query);
      if (error) {
        logger.warn(`Message history validation failed:`, error.details);
        return res.status(400).json({
          success: false,
          error: `Validation error: ${error.details[0].message}`
        } as MessageHistoryResponse);
      }

      const { limit, offset, before, after } = value;

      // Build query options
      const queryOptions: any = {
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
      const messages = await (MessageModel as any).findByEmergencyWithPagination(
        emergencyId,
        queryOptions
      );

      // Get total count for pagination
      const total = await (MessageModel as any).countByEmergency(emergencyId);
      const hasMore = offset + limit < total;

      logger.info(
        `Retrieved ${messages.length} messages for emergency ${emergencyId} ` +
        `(offset: ${offset}, limit: ${limit}, total: ${total})`
      );

      const response: MessageHistoryResponse = {
        success: true,
        messages,
        total,
        hasMore
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('Error retrieving message history:', error);
      return res.status(500).json({
        success: false,
        messages: [],
        total: 0,
        hasMore: false,
        error: 'An error occurred while retrieving messages'
      } as MessageHistoryResponse);
    }
  }
);

/**
 * POST /api/v1/messages/sync
 * Sync offline messages (batch upload)
 */
router.post(
  '/sync',
  authenticateHTTP,
  async (req: AuthenticatedRequest, res) => {
    try {
      // Validate request body
      const { error, value } = offlineSyncSchema.validate(req.body);
      if (error) {
        logger.warn(`Offline sync validation failed:`, error.details);
        return res.status(400).json({
          success: false,
          syncedMessages: [],
          failedMessages: [],
          error: `Validation error: ${error.details[0].message}`
        } as OfflineSyncResponse);
      }

      const { emergencyId, messages } = value as OfflineSyncRequest;

      // TODO: Verify user has access to this emergency room
      // await authorizeEmergencyAccess(req.userId, emergencyId, req.userRole);

      const syncedMessages: any[] = [];
      const failedMessages: string[] = [];

      // Process each message
      for (let i = 0; i < messages.length; i++) {
        try {
          const msgData = messages[i];

          // Verify sender matches authenticated user
          if (msgData.senderId !== req.userId) {
            logger.warn(`Offline sync: Sender mismatch for message ${i}`);
            failedMessages.push(`Message ${i}: Sender ID mismatch`);
            continue;
          }

          // Create and save message
          const messageDoc = new MessageModel({
            emergencyId,
            senderId: msgData.senderId,
            senderRole: msgData.senderRole || SenderRole.USER,
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
          await kafkaService.publishMessageSentEvent({
            emergencyId,
            messageId: message.id,
            senderId: msgData.senderId,
            messageType: msgData.type
          });

          logger.info(
            `Offline message synced: ${message.id} for emergency ${emergencyId}`
          );
        } catch (msgError) {
          logger.error(`Error syncing message ${i}:`, msgError);
          failedMessages.push(`Message ${i}: ${msgError instanceof Error ? msgError.message : 'Unknown error'}`);
        }
      }

      logger.info(
        `Offline sync completed for emergency ${emergencyId}: ` +
        `${syncedMessages.length} synced, ${failedMessages.length} failed`
      );

      const response: OfflineSyncResponse = {
        success: true,
        syncedMessages,
        failedMessages
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('Error syncing offline messages:', error);
      return res.status(500).json({
        success: false,
        syncedMessages: [],
        failedMessages: [],
        error: 'An error occurred while syncing messages'
      } as OfflineSyncResponse);
    }
  }
);

export default router;
