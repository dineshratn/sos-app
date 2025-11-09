import { Server, Socket } from 'socket.io';
import logger from '../../utils/logger';

interface TypingData {
  emergencyId: string;
}

// Map to track typing timeouts
const typingTimeouts = new Map<string, NodeJS.Timeout>();

/**
 * Handle typing start event
 */
export const handleTypingStart = (
  io: Server,
  socket: Socket,
  data: TypingData
): void => {
  try {
    const user = socket.data.user;
    const { emergencyId } = data;

    if (!emergencyId) {
      socket.emit('error', {
        code: 'INVALID_REQUEST',
        message: 'emergencyId is required',
      });
      return;
    }

    // Verify user is in the emergency room
    const rooms = Array.from(socket.rooms);
    if (!rooms.includes(emergencyId)) {
      return;
    }

    const typingKey = `${socket.id}:${emergencyId}`;

    // Clear existing timeout if any
    if (typingTimeouts.has(typingKey)) {
      clearTimeout(typingTimeouts.get(typingKey)!);
    }

    // Broadcast typing indicator to other users in the room (not to self)
    socket.to(emergencyId).emit('typing:indicator', {
      emergencyId,
      userId: user.userId,
      username: user.username || user.email || 'Unknown User',
      isTyping: true,
      timestamp: new Date().toISOString(),
    });

    // Auto-stop typing after 3 seconds of inactivity
    const timeout = setTimeout(() => {
      socket.to(emergencyId).emit('typing:indicator', {
        emergencyId,
        userId: user.userId,
        username: user.username || user.email || 'Unknown User',
        isTyping: false,
        timestamp: new Date().toISOString(),
      });

      typingTimeouts.delete(typingKey);
    }, 3000);

    typingTimeouts.set(typingKey, timeout);

    logger.debug('User started typing', {
      socketId: socket.id,
      userId: user.userId,
      emergencyId,
    });

  } catch (error: any) {
    logger.error('Error handling typing start', {
      socketId: socket.id,
      userId: socket.data.user?.userId,
      emergencyId: data.emergencyId,
      error: error.message,
    });
  }
};

/**
 * Handle typing stop event
 */
export const handleTypingStop = (
  io: Server,
  socket: Socket,
  data: TypingData
): void => {
  try {
    const user = socket.data.user;
    const { emergencyId } = data;

    if (!emergencyId) {
      return;
    }

    const typingKey = `${socket.id}:${emergencyId}`;

    // Clear timeout
    if (typingTimeouts.has(typingKey)) {
      clearTimeout(typingTimeouts.get(typingKey)!);
      typingTimeouts.delete(typingKey);
    }

    // Verify user is in the emergency room
    const rooms = Array.from(socket.rooms);
    if (!rooms.includes(emergencyId)) {
      return;
    }

    // Broadcast typing stop to other users in the room
    socket.to(emergencyId).emit('typing:indicator', {
      emergencyId,
      userId: user.userId,
      username: user.username || user.email || 'Unknown User',
      isTyping: false,
      timestamp: new Date().toISOString(),
    });

    logger.debug('User stopped typing', {
      socketId: socket.id,
      userId: user.userId,
      emergencyId,
    });

  } catch (error: any) {
    logger.error('Error handling typing stop', {
      socketId: socket.id,
      userId: socket.data.user?.userId,
      emergencyId: data.emergencyId,
      error: error.message,
    });
  }
};

/**
 * Clean up typing timeouts for a socket
 */
export const cleanupTypingTimeouts = (socketId: string): void => {
  const keysToDelete: string[] = [];

  typingTimeouts.forEach((timeout, key) => {
    if (key.startsWith(socketId)) {
      clearTimeout(timeout);
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => typingTimeouts.delete(key));
};

export default {
  handleTypingStart,
  handleTypingStop,
  cleanupTypingTimeouts,
};
