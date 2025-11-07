/**
 * Typing Handler Tests
 * Task 136: Comprehensive unit tests for typing indicator
 */

import { Server } from 'socket.io';
import { TypingHandler } from '../typing.handler';
import { AuthenticatedSocket } from '../../../middleware/auth.middleware';

jest.mock('../../../utils/logger');

describe('TypingHandler', () => {
  let typingHandler: TypingHandler;
  let mockIo: jest.Mocked<Server>;
  let mockSocket: jest.Mocked<AuthenticatedSocket>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    } as any;

    mockSocket = {
      id: 'socket-123',
      userId: 'user-456',
      userName: 'Test User',
      userRole: 'USER',
      on: jest.fn(),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    } as any;

    typingHandler = new TypingHandler(mockIo);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('handleTypingStart', () => {
    it('should broadcast typing:start event to room', () => {
      const data = {
        emergencyId: 'emergency-789',
        userId: 'user-456'
      };

      typingHandler.handleTypingStart(mockSocket, data);

      // Verify broadcast
      expect(mockSocket.to).toHaveBeenCalledWith(data.emergencyId);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'typing:start',
        expect.objectContaining({
          emergencyId: data.emergencyId,
          userId: data.userId,
          userName: 'Test User',
          isTyping: true
        })
      );
    });

    it('should auto-stop typing after 3 seconds', () => {
      const data = {
        emergencyId: 'emergency-789',
        userId: 'user-456'
      };

      typingHandler.handleTypingStart(mockSocket, data);

      // Fast-forward time by 3 seconds
      jest.advanceTimersByTime(3000);

      // Verify auto-stop was broadcast
      expect(mockSocket.to).toHaveBeenCalledWith(data.emergencyId);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'typing:stop',
        expect.objectContaining({
          emergencyId: data.emergencyId,
          userId: data.userId,
          isTyping: false
        })
      );
    });

    it('should reject typing:start with user ID mismatch', () => {
      const data = {
        emergencyId: 'emergency-789',
        userId: 'different-user'
      };

      typingHandler.handleTypingStart(mockSocket, data);

      // Verify no broadcast
      expect(mockSocket.to).not.toHaveBeenCalled();
    });

    it('should clear existing timer on new typing:start', () => {
      const data = {
        emergencyId: 'emergency-789',
        userId: 'user-456'
      };

      // Start typing
      typingHandler.handleTypingStart(mockSocket, data);

      // Clear mock calls
      jest.clearAllMocks();

      // Fast-forward 1 second
      jest.advanceTimersByTime(1000);

      // Start typing again (should reset timer)
      typingHandler.handleTypingStart(mockSocket, data);

      // Clear mock calls from second start
      jest.clearAllMocks();

      // Fast-forward 2 seconds (not enough to trigger original timer)
      jest.advanceTimersByTime(2000);

      // Should not auto-stop yet
      expect(mockSocket.emit).not.toHaveBeenCalledWith('typing:stop', expect.any(Object));

      // Fast-forward another 1 second (total 3 from second start)
      jest.advanceTimersByTime(1000);

      // Now should auto-stop
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'typing:stop',
        expect.objectContaining({
          isTyping: false
        })
      );
    });
  });

  describe('handleTypingStop', () => {
    it('should broadcast typing:stop event to room', () => {
      const data = {
        emergencyId: 'emergency-789',
        userId: 'user-456'
      };

      typingHandler.handleTypingStop(mockSocket, data);

      // Verify broadcast
      expect(mockSocket.to).toHaveBeenCalledWith(data.emergencyId);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'typing:stop',
        expect.objectContaining({
          emergencyId: data.emergencyId,
          userId: data.userId,
          isTyping: false
        })
      );
    });

    it('should clear existing timer', () => {
      const data = {
        emergencyId: 'emergency-789',
        userId: 'user-456'
      };

      // Start typing
      typingHandler.handleTypingStart(mockSocket, data);

      // Stop typing
      typingHandler.handleTypingStop(mockSocket, data);

      // Clear mock calls
      jest.clearAllMocks();

      // Fast-forward time
      jest.advanceTimersByTime(5000);

      // Should not auto-stop since timer was cleared
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('cleanupUserTimers', () => {
    it('should clean up all timers for a user', () => {
      const data1 = {
        emergencyId: 'emergency-789',
        userId: 'user-456'
      };

      const data2 = {
        emergencyId: 'emergency-999',
        userId: 'user-456'
      };

      // Start typing in two rooms
      typingHandler.handleTypingStart(mockSocket, data1);
      typingHandler.handleTypingStart(mockSocket, data2);

      // Cleanup user timers
      typingHandler.cleanupUserTimers('user-456');

      // Clear mock calls
      jest.clearAllMocks();

      // Fast-forward time
      jest.advanceTimersByTime(5000);

      // Should not trigger any auto-stops
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('registerHandlers', () => {
    it('should register all typing event handlers', () => {
      typingHandler.registerHandlers(mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith('typing:start', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('typing:stop', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });
  });
});
