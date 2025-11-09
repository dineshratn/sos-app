/**
 * Receipt Handler Tests
 * Task 136: Comprehensive unit tests for delivery/read receipts
 */

import { Server } from 'socket.io';
import { ReceiptHandler } from '../receipt.handler';
import MessageModel from '../../../db/schemas/message.schema';
import kafkaService from '../../../services/kafka.service';
import { AuthenticatedSocket } from '../../../middleware/auth.middleware';

jest.mock('../../../db/schemas/message.schema');
jest.mock('../../../services/kafka.service');
jest.mock('../../../utils/logger');

describe('ReceiptHandler', () => {
  let receiptHandler: ReceiptHandler;
  let mockIo: jest.Mocked<Server>;
  let mockSocket: jest.Mocked<AuthenticatedSocket>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    } as any;

    mockSocket = {
      id: 'socket-123',
      userId: 'user-456',
      userName: 'Test User',
      userRole: 'USER',
      on: jest.fn()
    } as any;

    receiptHandler = new ReceiptHandler(mockIo);
  });

  describe('handleMessageDelivered', () => {
    it('should mark message as delivered', async () => {
      const receiptData = {
        emergencyId: 'emergency-789',
        messageId: 'msg-001',
        userId: 'user-456',
        status: 'delivered' as const
      };

      const updatedMessage = {
        _id: 'msg-001',
        deliveredTo: ['user-456']
      };

      (MessageModel.markAsDelivered as jest.Mock) = jest.fn().mockResolvedValue(updatedMessage);

      await receiptHandler.handleMessageDelivered(mockSocket, receiptData);

      // Verify message was marked as delivered
      expect(MessageModel.markAsDelivered).toHaveBeenCalledWith(
        receiptData.messageId,
        receiptData.userId
      );

      // Verify broadcast
      expect(mockIo.to).toHaveBeenCalledWith(receiptData.emergencyId);
      expect(mockIo.emit).toHaveBeenCalledWith(
        'message:delivered',
        expect.objectContaining({
          messageId: receiptData.messageId,
          userId: receiptData.userId
        })
      );

      // Verify Kafka event
      expect(kafkaService.publishMessageDeliveredEvent).toHaveBeenCalledWith({
        emergencyId: receiptData.emergencyId,
        messageId: receiptData.messageId,
        userId: receiptData.userId
      });
    });

    it('should reject receipt with user ID mismatch', async () => {
      const receiptData = {
        emergencyId: 'emergency-789',
        messageId: 'msg-001',
        userId: 'different-user',
        status: 'delivered' as const
      };

      await receiptHandler.handleMessageDelivered(mockSocket, receiptData);

      // Verify no database update
      expect(MessageModel.markAsDelivered).not.toHaveBeenCalled();
    });

    it('should handle message not found gracefully', async () => {
      const receiptData = {
        emergencyId: 'emergency-789',
        messageId: 'non-existent',
        userId: 'user-456',
        status: 'delivered' as const
      };

      (MessageModel.markAsDelivered as jest.Mock) = jest.fn().mockResolvedValue(null);

      await receiptHandler.handleMessageDelivered(mockSocket, receiptData);

      // Should not throw error
      expect(MessageModel.markAsDelivered).toHaveBeenCalled();

      // Should not broadcast
      expect(mockIo.emit).not.toHaveBeenCalled();
    });
  });

  describe('handleMessageRead', () => {
    it('should mark message as read', async () => {
      const receiptData = {
        emergencyId: 'emergency-789',
        messageId: 'msg-001',
        userId: 'user-456',
        status: 'read' as const
      };

      const updatedMessage = {
        _id: 'msg-001',
        readBy: ['user-456']
      };

      (MessageModel.markAsRead as jest.Mock) = jest.fn().mockResolvedValue(updatedMessage);

      await receiptHandler.handleMessageRead(mockSocket, receiptData);

      // Verify message was marked as read
      expect(MessageModel.markAsRead).toHaveBeenCalledWith(
        receiptData.messageId,
        receiptData.userId
      );

      // Verify broadcast
      expect(mockIo.to).toHaveBeenCalledWith(receiptData.emergencyId);
      expect(mockIo.emit).toHaveBeenCalledWith(
        'message:read',
        expect.objectContaining({
          messageId: receiptData.messageId,
          userId: receiptData.userId
        })
      );

      // Verify Kafka event
      expect(kafkaService.publishMessageReadEvent).toHaveBeenCalledWith({
        emergencyId: receiptData.emergencyId,
        messageId: receiptData.messageId,
        userId: receiptData.userId
      });
    });
  });

  describe('handleBatchDelivered', () => {
    it('should mark multiple messages as delivered', async () => {
      const batchData = {
        emergencyId: 'emergency-789',
        messageIds: ['msg-001', 'msg-002', 'msg-003'],
        userId: 'user-456'
      };

      (MessageModel.markAsDelivered as jest.Mock) = jest.fn().mockResolvedValue({ _id: 'msg' });

      await receiptHandler.handleBatchDelivered(mockSocket, batchData);

      // Verify all messages were marked
      expect(MessageModel.markAsDelivered).toHaveBeenCalledTimes(3);
      expect(MessageModel.markAsDelivered).toHaveBeenCalledWith('msg-001', 'user-456');
      expect(MessageModel.markAsDelivered).toHaveBeenCalledWith('msg-002', 'user-456');
      expect(MessageModel.markAsDelivered).toHaveBeenCalledWith('msg-003', 'user-456');
    });

    it('should reject batch with invalid data', async () => {
      const batchData = {
        emergencyId: 'emergency-789',
        messageIds: 'not-an-array' as any,
        userId: 'user-456'
      };

      await receiptHandler.handleBatchDelivered(mockSocket, batchData);

      // Verify no database update
      expect(MessageModel.markAsDelivered).not.toHaveBeenCalled();
    });
  });

  describe('registerHandlers', () => {
    it('should register all receipt event handlers', () => {
      receiptHandler.registerHandlers(mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith('message:delivered', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('message:read', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('message:batch-delivered', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('message:batch-read', expect.any(Function));
    });
  });
});
