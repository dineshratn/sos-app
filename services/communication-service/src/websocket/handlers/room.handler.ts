import { Server, Socket } from 'socket.io';
import logger from '../../utils/logger';
import { getRoomSize } from '../socket.server';

interface JoinRoomData {
  emergencyId: string;
}

interface LeaveRoomData {
  emergencyId: string;
}

interface Participant {
  userId: string;
  username: string;
  socketId: string;
  joinedAt: Date;
}

/**
 * Handle client joining an emergency room
 */
export const handleJoinRoom = async (
  io: Server,
  socket: Socket,
  data: JoinRoomData
): Promise<void> => {
  try {
    const { emergencyId } = data;
    const user = socket.data.user;

    if (!emergencyId) {
      socket.emit('error', {
        code: 'INVALID_REQUEST',
        message: 'emergencyId is required',
      });
      return;
    }

    // Join the emergency room
    await socket.join(emergencyId);

    // Store emergency ID in socket data
    socket.data.emergencyId = emergencyId;

    logger.info('User joined emergency room', {
      socketId: socket.id,
      userId: user.userId,
      username: user.username,
      emergencyId,
    });

    // Get current room size
    const roomSize = await getRoomSize(emergencyId);

    // Create participant object
    const participant: Participant = {
      userId: user.userId,
      username: user.username || user.email || 'Unknown User',
      socketId: socket.id,
      joinedAt: new Date(),
    };

    // Notify the user that they successfully joined
    socket.emit('room:joined', {
      emergencyId,
      participant,
      participantCount: roomSize,
      timestamp: new Date().toISOString(),
    });

    // Broadcast to other users in the room that someone joined
    socket.to(emergencyId).emit('user:joined', {
      emergencyId,
      participant: {
        userId: user.userId,
        username: participant.username,
      },
      participantCount: roomSize,
      timestamp: new Date().toISOString(),
    });

    // Send list of undelivered messages (if any)
    // This will be handled by the message handler in a separate task

  } catch (error: any) {
    logger.error('Error joining room', {
      socketId: socket.id,
      userId: socket.data.user?.userId,
      emergencyId: data.emergencyId,
      error: error.message,
    });

    socket.emit('error', {
      code: 'JOIN_ROOM_FAILED',
      message: 'Failed to join emergency room',
      details: error.message,
    });
  }
};

/**
 * Handle client leaving an emergency room
 */
export const handleLeaveRoom = async (
  io: Server,
  socket: Socket,
  data: LeaveRoomData
): Promise<void> => {
  try {
    const { emergencyId } = data;
    const user = socket.data.user;

    if (!emergencyId) {
      socket.emit('error', {
        code: 'INVALID_REQUEST',
        message: 'emergencyId is required',
      });
      return;
    }

    // Leave the emergency room
    await socket.leave(emergencyId);

    // Clear emergency ID from socket data
    if (socket.data.emergencyId === emergencyId) {
      delete socket.data.emergencyId;
    }

    logger.info('User left emergency room', {
      socketId: socket.id,
      userId: user.userId,
      username: user.username,
      emergencyId,
    });

    // Get current room size after leaving
    const roomSize = await getRoomSize(emergencyId);

    // Notify the user that they successfully left
    socket.emit('room:left', {
      emergencyId,
      timestamp: new Date().toISOString(),
    });

    // Broadcast to other users in the room that someone left
    socket.to(emergencyId).emit('user:left', {
      emergencyId,
      participant: {
        userId: user.userId,
        username: user.username || user.email || 'Unknown User',
      },
      participantCount: roomSize,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error leaving room', {
      socketId: socket.id,
      userId: socket.data.user?.userId,
      emergencyId: data.emergencyId,
      error: error.message,
    });

    socket.emit('error', {
      code: 'LEAVE_ROOM_FAILED',
      message: 'Failed to leave emergency room',
      details: error.message,
    });
  }
};

/**
 * Handle automatic room cleanup on disconnect
 */
export const handleDisconnect = (io: Server, socket: Socket): void => {
  const user = socket.data.user;
  const emergencyId = socket.data.emergencyId;

  if (emergencyId) {
    logger.info('User disconnected from emergency room', {
      socketId: socket.id,
      userId: user?.userId,
      emergencyId,
    });

    // Broadcast to room that user disconnected
    socket.to(emergencyId).emit('user:left', {
      emergencyId,
      participant: {
        userId: user?.userId,
        username: user?.username || user?.email || 'Unknown User',
      },
      reason: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
};

export default {
  handleJoinRoom,
  handleLeaveRoom,
  handleDisconnect,
};
