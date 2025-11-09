import { Router, Request, Response } from 'express';
import Message from '../models/Message';
import { authenticateRequest, AuthenticatedRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/messages/:emergencyId
 * Get message history for an emergency with pagination
 */
router.get(
  '/:emergencyId',
  authenticateRequest,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { emergencyId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const before = req.query.before ? new Date(req.query.before as string) : undefined;

      // Validate limit
      if (limit < 1 || limit > 100) {
        res.status(400).json({
          error: {
            code: 'INVALID_LIMIT',
            message: 'Limit must be between 1 and 100',
          },
        });
        return;
      }

      // Build query
      const query: any = {
        emergencyId,
        deletedAt: { $exists: false },
      };

      if (before) {
        query.createdAt = { $lt: before };
      }

      // Fetch messages
      const messages = await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      // Transform messages for response
      const messagesResponse = messages.map((msg: any) => ({
        id: msg._id.toString(),
        emergencyId: msg.emergencyId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderRole: msg.senderRole,
        type: msg.type,
        content: msg.content,
        metadata: msg.metadata,
        delivered: msg.delivered,
        read: msg.read,
        deliveredAt: msg.deliveredAt,
        readAt: msg.readAt,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
      }));

      res.status(200).json({
        messages: messagesResponse,
        count: messagesResponse.length,
        hasMore: messagesResponse.length === limit,
        pagination: {
          limit,
          before: before?.toISOString(),
          nextBefore: messagesResponse.length > 0
            ? messagesResponse[messagesResponse.length - 1].createdAt
            : undefined,
        },
      });

      logger.info('Message history retrieved', {
        emergencyId,
        userId: req.user?.userId,
        count: messagesResponse.length,
      });

    } catch (error: any) {
      logger.error('Error retrieving message history', {
        emergencyId: req.params.emergencyId,
        userId: req.user?.userId,
        error: error.message,
      });

      res.status(500).json({
        error: {
          code: 'FETCH_MESSAGES_FAILED',
          message: 'Failed to retrieve message history',
        },
      });
    }
  }
);

/**
 * POST /api/v1/messages/sync
 * Sync offline messages (batch create)
 */
router.post(
  '/sync',
  authenticateRequest,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { messages } = req.body;

      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'messages array is required',
          },
        });
        return;
      }

      if (messages.length === 0) {
        res.status(200).json({
          synced: 0,
          messages: [],
        });
        return;
      }

      if (messages.length > 100) {
        res.status(400).json({
          error: {
            code: 'TOO_MANY_MESSAGES',
            message: 'Cannot sync more than 100 messages at once',
          },
        });
        return;
      }

      // Validate and prepare messages
      const messagesToInsert = messages.map((msg: any) => ({
        emergencyId: msg.emergencyId,
        senderId: user.userId,
        senderName: user.username || user.email || 'Unknown User',
        senderRole: msg.senderRole || 'USER',
        type: msg.type || 'TEXT',
        content: msg.content,
        metadata: msg.metadata || {},
        delivered: false,
        read: false,
        createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
      }));

      // Insert messages in bulk
      const insertedMessages = await Message.insertMany(messagesToInsert, {
        ordered: false, // Continue on error
      });

      logger.info('Offline messages synced', {
        userId: user.userId,
        count: insertedMessages.length,
      });

      res.status(200).json({
        synced: insertedMessages.length,
        messages: insertedMessages.map((msg: any) => ({
          id: msg._id.toString(),
          emergencyId: msg.emergencyId,
          createdAt: msg.createdAt,
        })),
      });

    } catch (error: any) {
      logger.error('Error syncing offline messages', {
        userId: req.user?.userId,
        error: error.message,
      });

      res.status(500).json({
        error: {
          code: 'SYNC_MESSAGES_FAILED',
          message: 'Failed to sync offline messages',
        },
      });
    }
  }
);

/**
 * DELETE /api/v1/messages/:messageId
 * Soft delete a message
 */
router.delete(
  '/:messageId',
  authenticateRequest,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { messageId } = req.params;
      const user = req.user!;

      // Find message
      const message = await Message.findById(messageId);

      if (!message) {
        res.status(404).json({
          error: {
            code: 'MESSAGE_NOT_FOUND',
            message: 'Message not found',
          },
        });
        return;
      }

      // Check if user owns the message
      if (message.senderId !== user.userId) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You can only delete your own messages',
          },
        });
        return;
      }

      // Soft delete
      message.deletedAt = new Date();
      await message.save();

      logger.info('Message soft deleted', {
        messageId,
        userId: user.userId,
        emergencyId: message.emergencyId,
      });

      res.status(200).json({
        message: 'Message deleted successfully',
        messageId,
      });

    } catch (error: any) {
      logger.error('Error deleting message', {
        messageId: req.params.messageId,
        userId: req.user?.userId,
        error: error.message,
      });

      res.status(500).json({
        error: {
          code: 'DELETE_MESSAGE_FAILED',
          message: 'Failed to delete message',
        },
      });
    }
  }
);

export default router;
