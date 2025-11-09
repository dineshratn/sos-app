import request from 'supertest';
import express, { Application } from 'express';
import authRoutes from '../../src/routes/auth.routes';
import User from '../../src/models/User';
import Session from '../../src/models/Session';
import { generateAccessToken } from '../../src/utils/jwt';

// Mock the database models
jest.mock('../../src/models/User');
jest.mock('../../src/models/Session');

describe('Auth Routes Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        toSafeObject: jest.fn().mockReturnValue({
          id: 'user-123',
          email: 'test@example.com',
          authProvider: 'local',
        }),
        save: jest.fn(),
      };

      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue(mockUser);
      (Session.create as jest.Mock).mockResolvedValue({
        id: 'session-123',
        toSafeObject: jest.fn().mockReturnValue({ id: 'session-123' }),
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          deviceId: 'device-123',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.tokens).toBeDefined();
      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          deviceId: 'device-123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
          deviceId: 'device-123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject registration without deviceId', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should reject login without email or phone', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          password: 'SecurePass123!',
          deviceId: 'device-123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          deviceId: 'device-123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject login without deviceId', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should reject refresh without refreshToken', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          deviceId: 'device-123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject refresh without deviceId', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'some-token',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should reject logout without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({
          allDevices: true,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('authorization');
    });

    it('should reject logout with invalid token format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'InvalidFormat token')
        .send({
          allDevices: true,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should require at least one logout parameter', async () => {
      const token = generateAccessToken('user-123', 'test@example.com');

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return user info with valid token', async () => {
      const token = generateAccessToken('user-123', 'test@example.com');
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        toSafeObject: jest.fn().mockReturnValue({
          id: 'user-123',
          email: 'test@example.com',
        }),
      };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
    });
  });

  describe('GET /api/v1/auth/sessions', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/v1/auth/sessions');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return sessions list with valid token', async () => {
      const token = generateAccessToken('user-123', 'test@example.com');
      const mockSessions = [
        {
          id: 'session-1',
          toSafeObject: jest.fn().mockReturnValue({ id: 'session-1' }),
        },
        {
          id: 'session-2',
          toSafeObject: jest.fn().mockReturnValue({ id: 'session-2' }),
        },
      ];

      (Session.findAll as jest.Mock).mockResolvedValue(mockSessions);

      const response = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.sessions).toBeDefined();
      expect(response.body.count).toBe(2);
    });
  });

  describe('Validation', () => {
    it('should validate phone number format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          phoneNumber: 'invalid-phone',
          deviceId: 'device-123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate device type', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          deviceId: 'device-123',
          deviceType: 'invalid-type',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should accept valid device types', async () => {
      const validTypes = ['ios', 'android', 'web', 'desktop', 'other'];

      for (const deviceType of validTypes) {
        (User.findOne as jest.Mock).mockResolvedValue(null);
        (User.create as jest.Mock).mockResolvedValue({
          id: 'user-123',
          toSafeObject: jest.fn().mockReturnValue({}),
        });
        (Session.create as jest.Mock).mockResolvedValue({
          id: 'session-123',
          toSafeObject: jest.fn().mockReturnValue({}),
        });

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: `test${deviceType}@example.com`,
            password: 'SecurePass123!',
            deviceId: 'device-123',
            deviceType,
          });

        // Should not fail validation
        expect(response.status).not.toBe(400);
      }
    });
  });
});
