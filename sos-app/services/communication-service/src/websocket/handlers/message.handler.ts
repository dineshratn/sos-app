/**
 * Message Handler
 * Task 128: Handle sending/receiving messages with validation, persistence, and Kafka events
 */

import { Server } from 'socket.io';
import Joi from 'joi';
import MessageModel from '../../db/schemas/message.schema';
import kafkaService from '../../services/kafka.service';
import { AuthenticatedSocket } from '../../middleware/auth.middleware';
import {
  SendMessageRequest,
  SendMessageResponse,
  MessageEvent,
  MessageType,
  SenderRole
} from '../../models/Message';
import logger from '../../utils/logger';

export class MessageHandler {
  private io: Server;

  // Validation schema for send message
  private sendMessageSchema = Joi.object({
    emergencyId: Joi.string().required(),
    senderId: Joi.string().required(),
    type: Joi.string()
      .valid(...Object.values(MessageType))
      .required(),
    content: Joi.string().required().max(10000),
    metadata: Joi.object().optional()
  });

  constructor(io: Server) {
    this.io = io;
  }

  /**
   * Handle sending a new message
   * Validates, saves to MongoDB, broadcasts to room, and publishes to Kafka
   */
  async handleSendMessage(
    socket: AuthenticatedSocket,
    data: SendMessageRequest,
    callback: (response: SendMessageResponse) => void
  ): Promise<void> {
    try {
      // Validate input
      const { error, value } = this.sendMessageSchema.validate(data);
      if (error) {
        logger.warn(`Message validation failed from socket ${socket.id}:`, error.details);
        return callback({
          success: false,
          error: `Validation error: ${error.details[0].message}`
        });
      }

      const { emergencyId, senderId, type, content, metadata } = value;

      // Verify user is authenticated and matches senderId
      if (socket.userId !== senderId) {
        logger.warn(
          `Send message failed: User ID mismatch. Socket user: ${socket.userId}, Request sender: ${senderId}`
        );
        return callback({
          success: false,
          error: 'Unauthorized: User ID mismatch'
        });
      }

      // Determine sender role from socket
      const senderRole = this.determineSenderRole(socket.userRole);

      // Create message document
      const messageDoc = new MessageModel({
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

      logger.info(
        `Message ${message.id} sent by ${senderId} to emergency ${emergencyId} (type: ${type})`
      );

      // Broadcast message to all users in the emergency room
      const messageEvent: MessageEvent = {
        event: 'message:new',
        emergencyId,
        message,
        timestamp: new Date()
      };

      // Broadcast to room (including sender)
      this.io.to(emergencyId).emit('message:new', messageEvent);

      // Publish event to Kafka
      await kafkaService.publishMessageSentEvent({
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
    } catch (error) {
      logger.error('Error in handleSendMessage:', error);
      callback({
        success: false,
        error: 'An error occurred while sending the message. Please try again.'
      });
    }
  }

  /**
   * Handle editing a message
   */
  async handleEditMessage(
    socket: AuthenticatedSocket,
    data: { messageId: string; content: string; emergencyId: string },
    callback: (response: SendMessageResponse) => void
  ): Promise<void> {
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
      const messageDoc = await MessageModel.findById(messageId);
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
      const messageEvent: MessageEvent = {
        event: 'message:updated',
        emergencyId,
        message,
        timestamp: new Date()
      };

      this.io.to(emergencyId).emit('message:updated', messageEvent);

      logger.info(`Message ${messageId} edited by ${socket.userId}`);

      callback({
        success: true,
        message
      });
    } catch (error) {
      logger.error('Error in handleEditMessage:', error);
      callback({
        success: false,
        error: 'An error occurred while editing the message'
      });
    }
  }

  /**
   * Handle deleting a message
   */
  async handleDeleteMessage(
    socket: AuthenticatedSocket,
    data: { messageId: string; emergencyId: string },
    callback: (response: { success: boolean; error?: string }) => void
  ): Promise<void> {
    try {
      const { messageId, emergencyId } = data;

      // Find message
      const messageDoc = await MessageModel.findById(messageId);
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
      const messageEvent: MessageEvent = {
        event: 'message:deleted',
        emergencyId,
        message,
        timestamp: new Date()
      };

      this.io.to(emergencyId).emit('message:deleted', messageEvent);

      logger.info(`Message ${messageId} deleted by ${socket.userId}`);

      callback({ success: true });
    } catch (error) {
      logger.error('Error in handleDeleteMessage:', error);
      callback({
        success: false,
        error: 'An error occurred while deleting the message'
      });
    }
  }

  /**
   * Determine sender role from user role
   */
  private determineSenderRole(userRole?: string): SenderRole {
    switch (userRole) {
      case 'ADMIN':
        return SenderRole.ADMIN;
      case 'RESPONDER':
        return SenderRole.RESPONDER;
      case 'CONTACT':
        return SenderRole.CONTACT;
      default:
        return SenderRole.USER;
    }
  }

  /**
   * Register all message-related event handlers
   */
  registerHandlers(socket: AuthenticatedSocket): void {
    // Send message handler
    socket.on('message:send', (data: SendMessageRequest, callback) => {
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

    logger.info(`Message handlers registered for socket ${socket.id}`);
  }
}
