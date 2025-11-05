/**
 * Message Routes Tests
 * Task 136: Comprehensive unit tests for message endpoints
 */

import request from 'supertest';
import express, { Express } from 'express';
import messageRoutes from '../message.routes';
import MessageModel from '../../db/schemas/message.schema';
import kafkaService from '../../services/kafka.service';
import { generateToken } from '../../middleware/auth.middleware';

jest.mock('../../db/schemas/message.schema');
jest.mock('../../services/kafka.service');
jest.mock('../../utils/logger');

describe('Message Routes', () => {
  let app: Express;
  let authToken: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/messages', messageRoutes);

    // Generate test token
    authToken = generateToken({
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER'
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/messages/:emergencyId', () => {
    it('should retrieve message history with default pagination', async () => {
      const mockMessages = [
        {
          id: 'msg-001',
          emergencyId: 'emergency-123',
          senderId: 'user-456',
          content: 'Test message 1',
          createdAt: new Date()
        },
        {
          id: 'msg-002',
          emergencyId: 'emergency-123',
          senderId: 'user-789',
          content: 'Test message 2',
          createdAt: new Date()
        }
      ];

      (MessageModel.findByEmergencyWithPagination as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockMessages);
      (MessageModel.countByEmergency as jest.Mock) = jest.fn().mockResolvedValue(2);

      const response = await request(app)
        .get('/api/v1/messages/emergency-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.messages).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.hasMore).toBe(false);
    });

    it('should handle pagination parameters', async () => {
      (MessageModel.findByEmergencyWithPagination as jest.Mock) = jest
        .fn()
        .mockResolvedValue([]);
      (MessageModel.countByEmergency as jest.Mock) = jest.fn().mockResolvedValue(100);

      await request(app)
        .get('/api/v1/messages/emergency-123')
        .query({ limit: 20, offset: 40 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(MessageModel.findByEmergencyWithPagination).toHaveBeenCalledWith(
        'emergency-123',
        expect.objectContaining({
          limit: 20,
          offset: 40
        })
      );
    });

    it('should handle date range filters', async () => {
      const before = new Date('2024-01-01T12:00:00Z');
      const after = new Date('2024-01-01T00:00:00Z');

      (MessageModel.findByEmergencyWithPagination as jest.Mock) = jest
        .fn()
        .mockResolvedValue([]);
      (MessageModel.countByEmergency as jest.Mock) = jest.fn().mockResolvedValue(0);

      await request(app)
        .get('/api/v1/messages/emergency-123')
        .query({
          before: before.toISOString(),
          after: after.toISOString()
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(MessageModel.findByEmergencyWithPagination).toHaveBeenCalledWith(
        'emergency-123',
        expect.objectContaining({
          before: expect.any(Date),
          after: expect.any(Date)
        })
      );
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/messages/emergency-123')
        .expect(401);
    });

    it('should validate query parameters', async () => {
      await request(app)
        .get('/api/v1/messages/emergency-123')
        .query({ limit: 200 }) // Exceeds max
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should handle database errors', async () => {
      (MessageModel.findByEmergencyWithPagination as jest.Mock) = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/messages/emergency-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/v1/messages/sync', () => {
    it('should sync offline messages', async () => {
      const offlineMessages = [
        {
          senderId: 'user-123',
          type: 'TEXT',
          content: 'Offline message 1',
          metadata: {}
        },
        {
          senderId: 'user-123',
          type: 'TEXT',
          content: 'Offline message 2',
          metadata: {}
        }
      ];

      const mockSavedMessage = {
        save: jest.fn().mockResolvedValue({
          toJSON: jest.fn().mockReturnValue({
            id: 'msg-synced',
            content: 'Synced message'
          })
        })
      };

      (MessageModel as any).mockImplementation(() => mockSavedMessage);

      const response = await request(app)
        .post('/api/v1/messages/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emergencyId: 'emergency-123',
          messages: offlineMessages
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.syncedMessages).toHaveLength(2);
      expect(response.body.failedMessages).toHaveLength(0);
    });

    it('should reject messages with sender mismatch', async () => {
      const offlineMessages = [
        {
          senderId: 'different-user', // Different from authenticated user
          type: 'TEXT',
          content: 'Unauthorized message',
          metadata: {}
        }
      ];

      const response = await request(app)
        .post('/api/v1/messages/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emergencyId: 'emergency-123',
          messages: offlineMessages
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.syncedMessages).toHaveLength(0);
      expect(response.body.failedMessages).toHaveLength(1);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/messages/sync')
        .send({
          emergencyId: 'emergency-123',
          messages: []
        })
        .expect(401);
    });

    it('should validate request body', async () => {
      await request(app)
        .post('/api/v1/messages/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing emergencyId
          messages: []
        })
        .expect(400);
    });

    it('should handle partial sync failures', async () => {
      const offlineMessages = [
        {
          senderId: 'user-123',
          type: 'TEXT',
          content: 'Good message',
          metadata: {}
        },
        {
          senderId: 'user-123',
          type: 'TEXT',
          content: 'Bad message',
          metadata: {}
        }
      ];

      let callCount = 0;
      (MessageModel as any).mockImplementation(() => ({
        save: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 2) {
            throw new Error('Save failed');
          }
          return {
            toJSON: jest.fn().mockReturnValue({
              id: `msg-${callCount}`,
              content: 'Synced'
            })
          };
        })
      }));

      const response = await request(app)
        .post('/api/v1/messages/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emergencyId: 'emergency-123',
          messages: offlineMessages
        })
        .expect(200);

      expect(response.body.syncedMessages).toHaveLength(1);
      expect(response.body.failedMessages).toHaveLength(1);
    });
  });
});
