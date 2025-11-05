/**
 * Receipt Handler
 * Task 134: Handle message:delivered and message:read events
 * Updates message status in MongoDB and publishes to Kafka
 */

import { Server } from 'socket.io';
import Joi from 'joi';
import MessageModel from '../../db/schemas/message.schema';
import kafkaService from '../../services/kafka.service';
import { AuthenticatedSocket } from '../../middleware/auth.middleware';
import { DeliveryReceiptRequest } from '../../models/Message';
import logger from '../../utils/logger';

export class ReceiptHandler {
  private io: Server;

  // Validation schema for receipt
  private receiptSchema = Joi.object({
    emergencyId: Joi.string().required(),
    messageId: Joi.string().required(),
    userId: Joi.string().required(),
    status: Joi.string().valid('delivered', 'read').required()
  });

  constructor(io: Server) {
    this.io = io;
  }

  /**
   * Handle message:delivered event
   * Marks message as delivered to a specific user
   */
  async handleMessageDelivered(
    socket: AuthenticatedSocket,
    data: DeliveryReceiptRequest
  ): Promise<void> {
    try {
      // Validate input
      const { error, value } = this.receiptSchema.validate({
        ...data,
        status: 'delivered'
      });

      if (error) {
        logger.warn(`Delivery receipt validation failed from socket ${socket.id}:`, error.details);
        return;
      }

      const { emergencyId, messageId, userId } = value;

      // Verify user is authenticated and matches userId
      if (socket.userId !== userId) {
        logger.warn(
          `Delivery receipt failed: User ID mismatch. Socket user: ${socket.userId}, Request user: ${userId}`
        );
        return;
      }

      // Update message in database
      const updatedMessage = await MessageModel.markAsDelivered(messageId, userId);

      if (!updatedMessage) {
        logger.warn(`Message not found for delivery receipt: ${messageId}`);
        return;
      }

      logger.info(`Message ${messageId} marked as delivered to user ${userId}`);

      // Broadcast delivery receipt to sender and other participants
      this.io.to(emergencyId).emit('message:delivered', {
        messageId,
        userId,
        timestamp: new Date()
      });

      // Publish to Kafka
      await kafkaService.publishMessageDeliveredEvent({
        emergencyId,
        messageId,
        userId
      });
    } catch (error) {
      logger.error('Error in handleMessageDelivered:', error);
    }
  }

  /**
   * Handle message:read event
   * Marks message as read by a specific user
   */
  async handleMessageRead(
    socket: AuthenticatedSocket,
    data: DeliveryReceiptRequest
  ): Promise<void> {
    try {
      // Validate input
      const { error, value } = this.receiptSchema.validate({
        ...data,
        status: 'read'
      });

      if (error) {
        logger.warn(`Read receipt validation failed from socket ${socket.id}:`, error.details);
        return;
      }

      const { emergencyId, messageId, userId } = value;

      // Verify user is authenticated and matches userId
      if (socket.userId !== userId) {
        logger.warn(
          `Read receipt failed: User ID mismatch. Socket user: ${socket.userId}, Request user: ${userId}`
        );
        return;
      }

      // Update message in database
      const updatedMessage = await MessageModel.markAsRead(messageId, userId);

      if (!updatedMessage) {
        logger.warn(`Message not found for read receipt: ${messageId}`);
        return;
      }

      logger.info(`Message ${messageId} marked as read by user ${userId}`);

      // Broadcast read receipt to sender and other participants
      this.io.to(emergencyId).emit('message:read', {
        messageId,
        userId,
        timestamp: new Date()
      });

      // Publish to Kafka
      await kafkaService.publishMessageReadEvent({
        emergencyId,
        messageId,
        userId
      });
    } catch (error) {
      logger.error('Error in handleMessageRead:', error);
    }
  }

  /**
   * Handle batch delivery receipts
   * Marks multiple messages as delivered at once
   */
  async handleBatchDelivered(
    socket: AuthenticatedSocket,
    data: { emergencyId: string; messageIds: string[]; userId: string }
  ): Promise<void> {
    try {
      const { emergencyId, messageIds, userId } = data;

      if (!emergencyId || !messageIds || !userId || !Array.isArray(messageIds)) {
        logger.warn(`Batch delivery receipt: Invalid data from socket ${socket.id}`);
        return;
      }

      // Verify user is authenticated and matches userId
      if (socket.userId !== userId) {
        logger.warn(
          `Batch delivery receipt failed: User ID mismatch. Socket user: ${socket.userId}, Request user: ${userId}`
        );
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

      logger.info(`Batch delivery receipt: ${messageIds.length} messages marked as delivered to user ${userId}`);
    } catch (error) {
      logger.error('Error in handleBatchDelivered:', error);
    }
  }

  /**
   * Handle batch read receipts
   * Marks multiple messages as read at once
   */
  async handleBatchRead(
    socket: AuthenticatedSocket,
    data: { emergencyId: string; messageIds: string[]; userId: string }
  ): Promise<void> {
    try {
      const { emergencyId, messageIds, userId } = data;

      if (!emergencyId || !messageIds || !userId || !Array.isArray(messageIds)) {
        logger.warn(`Batch read receipt: Invalid data from socket ${socket.id}`);
        return;
      }

      // Verify user is authenticated and matches userId
      if (socket.userId !== userId) {
        logger.warn(
          `Batch read receipt failed: User ID mismatch. Socket user: ${socket.userId}, Request user: ${userId}`
        );
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

      logger.info(`Batch read receipt: ${messageIds.length} messages marked as read by user ${userId}`);
    } catch (error) {
      logger.error('Error in handleBatchRead:', error);
    }
  }

  /**
   * Register all receipt-related event handlers
   */
  registerHandlers(socket: AuthenticatedSocket): void {
    // Single message delivery receipt
    socket.on('message:delivered', (data: DeliveryReceiptRequest) => {
      this.handleMessageDelivered(socket, data);
    });

    // Single message read receipt
    socket.on('message:read', (data: DeliveryReceiptRequest) => {
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

    logger.info(`Receipt handlers registered for socket ${socket.id}`);
  }
}
