/**
 * Message Handler Tests
 * Task 136: Comprehensive unit tests for message handler
 */

import { Server } from 'socket.io';
import { MessageHandler } from '../message.handler';
import MessageModel from '../../../db/schemas/message.schema';
import kafkaService from '../../../services/kafka.service';
import { AuthenticatedSocket } from '../../../middleware/auth.middleware';
import { MessageType, SenderRole } from '../../../models/Message';

// Mock dependencies
jest.mock('../../../db/schemas/message.schema');
jest.mock('../../../services/kafka.service');
jest.mock('../../../utils/logger');

describe('MessageHandler', () => {
  let messageHandler: MessageHandler;
  let mockIo: jest.Mocked<Server>;
  let mockSocket: jest.Mocked<AuthenticatedSocket>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Socket.IO server
    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    } as any;

    // Create mock authenticated socket
    mockSocket = {
      id: 'socket-123',
      userId: 'user-456',
      userName: 'Test User',
      userRole: 'USER',
      on: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      join: jest.fn(),
      leave: jest.fn()
    } as any;

    messageHandler = new MessageHandler(mockIo);
  });

  describe('handleSendMessage', () => {
    it('should successfully send a text message', async () => {
      const messageData = {
        emergencyId: 'emergency-789',
        senderId: 'user-456',
        type: MessageType.TEXT,
        content: 'Help needed!',
        metadata: {}
      };

      const savedMessage = {
        _id: 'msg-001',
        ...messageData,
        senderRole: SenderRole.USER,
        status: 'SENT',
        deliveredTo: [],
        readBy: [],
        createdAt: new Date(),
        toJSON: jest.fn().mockReturnValue({
          id: 'msg-001',
          ...messageData,
          senderRole: SenderRole.USER,
          status: 'SENT',
          deliveredTo: [],
          readBy: [],
          createdAt: new Date()
        })
      };

      // Mock MessageModel save
      (MessageModel as any).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(savedMessage)
      }));

      const callback = jest.fn();

      await messageHandler.handleSendMessage(mockSocket, messageData, callback);

      // Verify message was saved
      expect(MessageModel).toHaveBeenCalledWith(
        expect.objectContaining({
          emergencyId: messageData.emergencyId,
          senderId: messageData.senderId,
          type: messageData.type,
          content: messageData.content
        })
      );

      // Verify broadcast
      expect(mockIo.to).toHaveBeenCalledWith(messageData.emergencyId);
      expect(mockIo.emit).toHaveBeenCalledWith(
        'message:new',
        expect.objectContaining({
          event: 'message:new',
          emergencyId: messageData.emergencyId
        })
      );

      // Verify Kafka event
      expect(kafkaService.publishMessageSentEvent).toHaveBeenCalledWith({
        emergencyId: messageData.emergencyId,
        messageId: 'msg-001',
        senderId: messageData.senderId,
        messageType: messageData.type
      });

      // Verify callback
      expect(callback).toHaveBeenCalledWith({
        success: true,
        message: expect.objectContaining({
          id: 'msg-001'
        })
      });
    });

    it('should reject message with missing required fields', async () => {
      const messageData = {
        emergencyId: 'emergency-789',
        // Missing senderId
        type: MessageType.TEXT,
        content: 'Help needed!'
      } as any;

      const callback = jest.fn();

      await messageHandler.handleSendMessage(mockSocket, messageData, callback);

      // Verify callback with error
      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Validation error')
      });

      // Verify message was not saved
      expect(MessageModel).not.toHaveBeenCalled();
    });

    it('should reject message from unauthorized user', async () => {
      const messageData = {
        emergencyId: 'emergency-789',
        senderId: 'different-user',
        type: MessageType.TEXT,
        content: 'Help needed!'
      };

      const callback = jest.fn();

      await messageHandler.handleSendMessage(mockSocket, messageData, callback);

      // Verify callback with error
      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Unauthorized')
      });

      // Verify message was not saved
      expect(MessageModel).not.toHaveBeenCalled();
    });

    it('should handle message save error gracefully', async () => {
      const messageData = {
        emergencyId: 'emergency-789',
        senderId: 'user-456',
        type: MessageType.TEXT,
        content: 'Help needed!'
      };

      // Mock MessageModel save to throw error
      (MessageModel as any).mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error('Database error'))
      }));

      const callback = jest.fn();

      await messageHandler.handleSendMessage(mockSocket, messageData, callback);

      // Verify error callback
      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('error occurred')
      });
    });
  });

  describe('handleEditMessage', () => {
    it('should successfully edit a message', async () => {
      const editData = {
        messageId: 'msg-001',
        content: 'Updated message',
        emergencyId: 'emergency-789'
      };

      const mockMessage = {
        _id: 'msg-001',
        senderId: 'user-456',
        content: 'Old message',
        metadata: {},
        save: jest.fn().mockResolvedValue({
          toJSON: jest.fn().mockReturnValue({
            id: 'msg-001',
            content: 'Updated message',
            metadata: { isEdited: true, editedAt: expect.any(Date) }
          })
        }),
        toJSON: jest.fn().mockReturnValue({
          id: 'msg-001',
          content: 'Updated message'
        })
      };

      (MessageModel.findById as jest.Mock) = jest.fn().mockResolvedValue(mockMessage);

      const callback = jest.fn();

      await messageHandler.handleEditMessage(mockSocket, editData, callback);

      // Verify message was updated
      expect(mockMessage.save).toHaveBeenCalled();
      expect(mockMessage.content).toBe('Updated message');

      // Verify broadcast
      expect(mockIo.to).toHaveBeenCalledWith(editData.emergencyId);

      // Verify callback
      expect(callback).toHaveBeenCalledWith({
        success: true,
        message: expect.any(Object)
      });
    });

    it('should reject editing another user message', async () => {
      const editData = {
        messageId: 'msg-001',
        content: 'Updated message',
        emergencyId: 'emergency-789'
      };

      const mockMessage = {
        senderId: 'different-user',
        content: 'Old message'
      };

      (MessageModel.findById as jest.Mock) = jest.fn().mockResolvedValue(mockMessage);

      const callback = jest.fn();

      await messageHandler.handleEditMessage(mockSocket, editData, callback);

      // Verify error callback
      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Unauthorized')
      });
    });
  });

  describe('registerHandlers', () => {
    it('should register all message event handlers', () => {
      messageHandler.registerHandlers(mockSocket);

      // Verify all handlers are registered
      expect(mockSocket.on).toHaveBeenCalledWith('message:send', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('message:edit', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('message:delete', expect.any(Function));
    });
  });
});
