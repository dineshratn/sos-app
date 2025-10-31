/**
 * Room Handler Unit Tests
 * Tests for join/leave emergency room functionality
 */

import { Server } from 'socket.io';
import { RoomHandler } from '../room.handler';
import redisService from '../../services/redis.service';
import { authorizeEmergencyAccess } from '../../middleware/auth.middleware';
import {
  ParticipantRole,
  JoinRoomRequest,
  JoinRoomResponse,
  Participant
} from '../../models/participant.model';

// Mock dependencies
jest.mock('../../services/redis.service');
jest.mock('../../middleware/auth.middleware');
jest.mock('../../utils/logger');

describe('RoomHandler', () => {
  let roomHandler: RoomHandler;
  let mockIo: jest.Mocked<Server>;
  let mockSocket: any;
  let mockCallback: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock Socket.IO server
    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    } as any;

    // Create mock socket
    mockSocket = {
      id: 'socket_123',
      userId: 'user_123',
      userName: 'John Doe',
      userRole: 'USER',
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      on: jest.fn()
    };

    // Create mock callback
    mockCallback = jest.fn();

    // Initialize handler
    roomHandler = new RoomHandler(mockIo);
  });

  describe('handleJoinRoom', () => {
    const validJoinRequest: JoinRoomRequest = {
      emergencyId: 'emg_123',
      userId: 'user_123',
      name: 'John Doe',
      role: ParticipantRole.USER
    };

    it('should successfully join a user to an emergency room', async () => {
      // Mock authorization
      (authorizeEmergencyAccess as jest.Mock).mockResolvedValue(true);

      // Mock Redis checks
      (redisService.isUserInRoom as jest.Mock).mockResolvedValue(false);
      (redisService.addParticipantToRoom as jest.Mock).mockResolvedValue(undefined);
      (redisService.getRoomParticipants as jest.Mock).mockResolvedValue([
        {
          userId: 'user_123',
          socketId: 'socket_123',
          name: 'John Doe',
          role: ParticipantRole.USER,
          joinedAt: new Date(),
          lastSeenAt: new Date(),
          isOnline: true
        }
      ]);

      await roomHandler.handleJoinRoom(mockSocket, validJoinRequest, mockCallback);

      // Verify socket joined the room
      expect(mockSocket.join).toHaveBeenCalledWith('emg_123');

      // Verify participant was added to Redis
      expect(redisService.addParticipantToRoom).toHaveBeenCalledWith(
        'emg_123',
        expect.objectContaining({
          userId: 'user_123',
          socketId: 'socket_123',
          name: 'John Doe',
          role: ParticipantRole.USER,
          isOnline: true
        })
      );

      // Verify broadcast to other users
      expect(mockSocket.to).toHaveBeenCalledWith('emg_123');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'user:joined',
        expect.objectContaining({
          event: 'user:joined',
          emergencyId: 'emg_123'
        })
      );

      // Verify callback with success response
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Successfully joined emergency room',
          participant: expect.any(Object),
          participants: expect.any(Array),
          roomInfo: expect.objectContaining({
            emergencyId: 'emg_123',
            participantCount: 1
          })
        })
      );
    });

    it('should reject join request with missing fields', async () => {
      const invalidRequest = {
        emergencyId: 'emg_123',
        userId: 'user_123'
        // Missing name and role
      } as JoinRoomRequest;

      await roomHandler.handleJoinRoom(mockSocket, invalidRequest, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Missing required fields')
      });

      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('should reject join request with user ID mismatch', async () => {
      const mismatchRequest: JoinRoomRequest = {
        emergencyId: 'emg_123',
        userId: 'user_999', // Different from socket.userId
        name: 'John Doe',
        role: ParticipantRole.USER
      };

      await roomHandler.handleJoinRoom(mockSocket, mismatchRequest, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('User ID mismatch')
      });

      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('should reject join request with invalid role', async () => {
      const invalidRoleRequest: JoinRoomRequest = {
        emergencyId: 'emg_123',
        userId: 'user_123',
        name: 'John Doe',
        role: 'INVALID_ROLE' as ParticipantRole
      };

      await roomHandler.handleJoinRoom(mockSocket, invalidRoleRequest, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Invalid role')
      });

      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('should reject join request when user is not authorized', async () => {
      // Mock authorization failure
      (authorizeEmergencyAccess as jest.Mock).mockResolvedValue(false);

      await roomHandler.handleJoinRoom(mockSocket, validJoinRequest, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('not have access')
      });

      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('should handle user already in room (reconnection)', async () => {
      // Mock authorization
      (authorizeEmergencyAccess as jest.Mock).mockResolvedValue(true);

      // Mock user already in room
      (redisService.isUserInRoom as jest.Mock).mockResolvedValue(true);
      (redisService.updateParticipantOnlineStatus as jest.Mock).mockResolvedValue(undefined);
      (redisService.getParticipant as jest.Mock).mockResolvedValue({
        userId: 'user_123',
        socketId: 'old_socket_id',
        name: 'John Doe',
        role: ParticipantRole.USER,
        joinedAt: new Date(),
        lastSeenAt: new Date(),
        isOnline: true
      });
      (redisService.getRoomParticipants as jest.Mock).mockResolvedValue([]);

      await roomHandler.handleJoinRoom(mockSocket, validJoinRequest, mockCallback);

      // Verify reconnection handling
      expect(redisService.updateParticipantOnlineStatus).toHaveBeenCalledWith(
        'emg_123',
        'user_123',
        true
      );

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Reconnected to emergency room'
        })
      );
    });

    it('should handle different participant roles', async () => {
      // Mock authorization
      (authorizeEmergencyAccess as jest.Mock).mockResolvedValue(true);
      (redisService.isUserInRoom as jest.Mock).mockResolvedValue(false);
      (redisService.addParticipantToRoom as jest.Mock).mockResolvedValue(undefined);
      (redisService.getRoomParticipants as jest.Mock).mockResolvedValue([]);

      const roles = [
        ParticipantRole.USER,
        ParticipantRole.CONTACT,
        ParticipantRole.RESPONDER,
        ParticipantRole.ADMIN
      ];

      for (const role of roles) {
        jest.clearAllMocks();

        const request: JoinRoomRequest = {
          ...validJoinRequest,
          role
        };

        await roomHandler.handleJoinRoom(mockSocket, request, mockCallback);

        expect(mockCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            participant: expect.objectContaining({ role })
          })
        );
      }
    });

    it('should handle errors gracefully', async () => {
      // Mock authorization
      (authorizeEmergencyAccess as jest.Mock).mockResolvedValue(true);
      (redisService.isUserInRoom as jest.Mock).mockResolvedValue(false);

      // Mock Redis error
      (redisService.addParticipantToRoom as jest.Mock).mockRejectedValue(
        new Error('Redis connection failed')
      );

      await roomHandler.handleJoinRoom(mockSocket, validJoinRequest, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('error occurred')
      });
    });
  });

  describe('handleLeaveRoom', () => {
    const validLeaveRequest = {
      emergencyId: 'emg_123',
      userId: 'user_123'
    };

    it('should successfully remove user from emergency room', async () => {
      const mockParticipant: Participant = {
        userId: 'user_123',
        socketId: 'socket_123',
        name: 'John Doe',
        role: ParticipantRole.USER,
        joinedAt: new Date(),
        lastSeenAt: new Date(),
        isOnline: true
      };

      (redisService.getParticipant as jest.Mock).mockResolvedValue(mockParticipant);
      (redisService.removeParticipantFromRoom as jest.Mock).mockResolvedValue(undefined);
      (redisService.getRoomParticipantCount as jest.Mock).mockResolvedValue(2);

      await roomHandler.handleLeaveRoom(mockSocket, validLeaveRequest, mockCallback);

      // Verify socket left the room
      expect(mockSocket.leave).toHaveBeenCalledWith('emg_123');

      // Verify participant was removed from Redis
      expect(redisService.removeParticipantFromRoom).toHaveBeenCalledWith('emg_123', 'user_123');

      // Verify broadcast to other users
      expect(mockSocket.to).toHaveBeenCalledWith('emg_123');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'user:left',
        expect.objectContaining({
          event: 'user:left',
          emergencyId: 'emg_123',
          participant: mockParticipant
        })
      );

      // Verify callback with success
      expect(mockCallback).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully left emergency room'
      });
    });

    it('should reject leave request with missing fields', async () => {
      const invalidRequest = {
        emergencyId: 'emg_123'
        // Missing userId
      };

      await roomHandler.handleLeaveRoom(mockSocket, invalidRequest as any, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Missing required fields')
      });

      expect(mockSocket.leave).not.toHaveBeenCalled();
    });

    it('should reject leave request with user ID mismatch', async () => {
      const mismatchRequest = {
        emergencyId: 'emg_123',
        userId: 'user_999'
      };

      await roomHandler.handleLeaveRoom(mockSocket, mismatchRequest, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('User ID mismatch')
      });

      expect(mockSocket.leave).not.toHaveBeenCalled();
    });
  });

  describe('handleGetOnlineParticipants', () => {
    it('should return list of online participants', async () => {
      const mockParticipants: Participant[] = [
        {
          userId: 'user_123',
          socketId: 'socket_123',
          name: 'John Doe',
          role: ParticipantRole.USER,
          joinedAt: new Date(),
          lastSeenAt: new Date(),
          isOnline: true
        },
        {
          userId: 'user_456',
          socketId: 'socket_456',
          name: 'Jane Smith',
          role: ParticipantRole.CONTACT,
          joinedAt: new Date(),
          lastSeenAt: new Date(),
          isOnline: true
        }
      ];

      (redisService.getRoomParticipants as jest.Mock).mockResolvedValue(mockParticipants);

      await roomHandler.handleGetOnlineParticipants(
        mockSocket,
        { emergencyId: 'emg_123' },
        mockCallback
      );

      expect(mockCallback).toHaveBeenCalledWith({
        success: true,
        participants: mockParticipants
      });
    });

    it('should handle missing emergencyId', async () => {
      await roomHandler.handleGetOnlineParticipants(
        mockSocket,
        { emergencyId: '' },
        mockCallback
      );

      expect(mockCallback).toHaveBeenCalledWith({
        success: false,
        message: 'Missing emergencyId'
      });
    });
  });

  describe('registerHandlers', () => {
    it('should register all room event handlers', () => {
      roomHandler.registerHandlers(mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith('room:join', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('room:leave', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('room:get-participants', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('room:update-last-seen', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });
  });
});
