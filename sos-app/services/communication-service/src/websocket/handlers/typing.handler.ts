/**
 * Typing Indicator Handler
 * Task 131: Handle typing:start and typing:stop events with 3-second debounce
 */

import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../../middleware/auth.middleware';
import { TypingEvent } from '../../models/Message';
import logger from '../../utils/logger';

export class TypingHandler {
  private io: Server;
  private typingTimers: Map<string, NodeJS.Timeout>; // Key: userId:emergencyId
  private readonly TYPING_TIMEOUT = 3000; // 3 seconds

  constructor(io: Server) {
    this.io = io;
    this.typingTimers = new Map();
  }

  /**
   * Handle typing:start event
   * Broadcasts to other users in the room and auto-stops after 3 seconds
   */
  handleTypingStart(
    socket: AuthenticatedSocket,
    data: { emergencyId: string; userId: string }
  ): void {
    try {
      const { emergencyId, userId } = data;

      // Validate required fields
      if (!emergencyId || !userId) {
        logger.warn(`Typing start failed: Missing required fields from socket ${socket.id}`);
        return;
      }

      // Verify user is authenticated and matches userId
      if (socket.userId !== userId) {
        logger.warn(
          `Typing start failed: User ID mismatch. Socket user: ${socket.userId}, Request user: ${userId}`
        );
        return;
      }

      const timerKey = `${userId}:${emergencyId}`;

      // Clear any existing timer for this user in this room
      if (this.typingTimers.has(timerKey)) {
        clearTimeout(this.typingTimers.get(timerKey)!);
      }

      // Create typing event
      const typingEvent: TypingEvent = {
        emergencyId,
        userId,
        userName: socket.userName || 'User',
        isTyping: true,
        timestamp: new Date()
      };

      // Broadcast to other users in the room (exclude sender)
      socket.to(emergencyId).emit('typing:start', typingEvent);

      logger.debug(`User ${userId} started typing in room ${emergencyId}`);

      // Set auto-stop timer (3 seconds)
      const timer = setTimeout(() => {
        this.autoStopTyping(socket, emergencyId, userId);
        this.typingTimers.delete(timerKey);
      }, this.TYPING_TIMEOUT);

      this.typingTimers.set(timerKey, timer);
    } catch (error) {
      logger.error('Error in handleTypingStart:', error);
    }
  }

  /**
   * Handle typing:stop event
   * Broadcasts to other users that typing has stopped
   */
  handleTypingStop(
    socket: AuthenticatedSocket,
    data: { emergencyId: string; userId: string }
  ): void {
    try {
      const { emergencyId, userId } = data;

      // Validate required fields
      if (!emergencyId || !userId) {
        logger.warn(`Typing stop failed: Missing required fields from socket ${socket.id}`);
        return;
      }

      // Verify user is authenticated and matches userId
      if (socket.userId !== userId) {
        logger.warn(
          `Typing stop failed: User ID mismatch. Socket user: ${socket.userId}, Request user: ${userId}`
        );
        return;
      }

      const timerKey = `${userId}:${emergencyId}`;

      // Clear any existing timer
      if (this.typingTimers.has(timerKey)) {
        clearTimeout(this.typingTimers.get(timerKey)!);
        this.typingTimers.delete(timerKey);
      }

      // Create typing event
      const typingEvent: TypingEvent = {
        emergencyId,
        userId,
        userName: socket.userName || 'User',
        isTyping: false,
        timestamp: new Date()
      };

      // Broadcast to other users in the room (exclude sender)
      socket.to(emergencyId).emit('typing:stop', typingEvent);

      logger.debug(`User ${userId} stopped typing in room ${emergencyId}`);
    } catch (error) {
      logger.error('Error in handleTypingStop:', error);
    }
  }

  /**
   * Auto-stop typing after timeout
   */
  private autoStopTyping(
    socket: AuthenticatedSocket,
    emergencyId: string,
    userId: string
  ): void {
    try {
      const typingEvent: TypingEvent = {
        emergencyId,
        userId,
        userName: socket.userName || 'User',
        isTyping: false,
        timestamp: new Date()
      };

      // Broadcast to room
      socket.to(emergencyId).emit('typing:stop', typingEvent);

      logger.debug(`Auto-stopped typing for user ${userId} in room ${emergencyId}`);
    } catch (error) {
      logger.error('Error in autoStopTyping:', error);
    }
  }

  /**
   * Clean up typing timers for a user (called on disconnect)
   */
  cleanupUserTimers(userId: string): void {
    const keysToDelete: string[] = [];

    this.typingTimers.forEach((timer, key) => {
      if (key.startsWith(`${userId}:`)) {
        clearTimeout(timer);
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      this.typingTimers.delete(key);
    });

    if (keysToDelete.length > 0) {
      logger.debug(`Cleaned up ${keysToDelete.length} typing timers for user ${userId}`);
    }
  }

  /**
   * Clean up typing timers for a room
   */
  cleanupRoomTimers(emergencyId: string): void {
    const keysToDelete: string[] = [];

    this.typingTimers.forEach((timer, key) => {
      if (key.endsWith(`:${emergencyId}`)) {
        clearTimeout(timer);
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      this.typingTimers.delete(key);
    });

    if (keysToDelete.length > 0) {
      logger.debug(`Cleaned up ${keysToDelete.length} typing timers for room ${emergencyId}`);
    }
  }

  /**
   * Register all typing-related event handlers
   */
  registerHandlers(socket: AuthenticatedSocket): void {
    // Typing start handler
    socket.on('typing:start', (data) => {
      this.handleTypingStart(socket, data);
    });

    // Typing stop handler
    socket.on('typing:stop', (data) => {
      this.handleTypingStop(socket, data);
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      if (socket.userId) {
        this.cleanupUserTimers(socket.userId);
      }
    });

    logger.info(`Typing handlers registered for socket ${socket.id}`);
  }
}
