import { Server, Socket } from 'socket.io';
import Message from '../../models/Message';
import logger from '../../utils/logger';
import { publishMessageDeliveredEvent, publishMessageReadEvent } from '../../services/kafka.service';

interface MessageDeliveredData {
  messageId: string;
  emergencyId: string;
}

interface MessageReadData {
  messageId: string;
  emergencyId: string;
}

/**
 * Handle message delivered receipt
 */
export const handleMessageDelivered = async (
  io: Server,
  socket: Socket,
  data: MessageDeliveredData
): Promise<void> => {
  try {
    const user = socket.data.user;
    const { messageId, emergencyId } = data;

    if (!messageId || !emergencyId) {
      socket.emit('error', {
        code: 'INVALID_REQUEST',
        message: 'messageId and emergencyId are required',
      });
      return;
    }

    // Verify user is in the emergency room
    const rooms = Array.from(socket.rooms);
    if (!rooms.includes(emergencyId)) {
      return;
    }

    // Update message delivered status in MongoDB
    const message = await Message.findByIdAndUpdate(
      messageId,
      {
        delivered: true,
        deliveredAt: new Date(),
      },
      { new: true }
    );

    if (!message) {
      logger.warn('Message not found for delivery receipt', {
        messageId,
        emergencyId,
        userId: user.userId,
      });
      return;
    }

    logger.debug('Message marked as delivered', {
      messageId,
      emergencyId,
      userId: user.userId,
      deliveredAt: message.deliveredAt,
    });

    // Broadcast delivery receipt to all users in the room
    io.to(emergencyId).emit('message:delivered', {
      messageId,
      emergencyId,
      deliveredBy: user.userId,
      deliveredAt: message.deliveredAt?.toISOString(),
      timestamp: new Date().toISOString(),
    });

    // Publish MessageDelivered event to Kafka
    await publishMessageDeliveredEvent(messageId, emergencyId, user.userId);

  } catch (error: any) {
    logger.error('Error handling message delivered receipt', {
      socketId: socket.id,
      userId: socket.data.user?.userId,
      messageId: data.messageId,
      emergencyId: data.emergencyId,
      error: error.message,
    });
  }
};

/**
 * Handle message read receipt
 */
export const handleMessageRead = async (
  io: Server,
  socket: Socket,
  data: MessageReadData
): Promise<void> => {
  try {
    const user = socket.data.user;
    const { messageId, emergencyId } = data;

    if (!messageId || !emergencyId) {
      socket.emit('error', {
        code: 'INVALID_REQUEST',
        message: 'messageId and emergencyId are required',
      });
      return;
    }

    // Verify user is in the emergency room
    const rooms = Array.from(socket.rooms);
    if (!rooms.includes(emergencyId)) {
      return;
    }

    // Update message read status in MongoDB
    const message = await Message.findByIdAndUpdate(
      messageId,
      {
        read: true,
        readAt: new Date(),
        // Also mark as delivered if not already
        $setOnInsert: {
          delivered: true,
          deliveredAt: new Date(),
        },
      },
      { new: true }
    );

    if (!message) {
      logger.warn('Message not found for read receipt', {
        messageId,
        emergencyId,
        userId: user.userId,
      });
      return;
    }

    logger.debug('Message marked as read', {
      messageId,
      emergencyId,
      userId: user.userId,
      readAt: message.readAt,
    });

    // Broadcast read receipt to all users in the room
    io.to(emergencyId).emit('message:read', {
      messageId,
      emergencyId,
      readBy: user.userId,
      readAt: message.readAt?.toISOString(),
      timestamp: new Date().toISOString(),
    });

    // Publish MessageRead event to Kafka
    await publishMessageReadEvent(messageId, emergencyId, user.userId);

  } catch (error: any) {
    logger.error('Error handling message read receipt', {
      socketId: socket.id,
      userId: socket.data.user?.userId,
      messageId: data.messageId,
      emergencyId: data.emergencyId,
      error: error.message,
    });
  }
};

/**
 * Bulk mark messages as delivered
 */
export const bulkMarkMessagesDelivered = async (
  socket: Socket,
  emergencyId: string,
  messageIds: string[]
): Promise<void> => {
  try {
    const user = socket.data.user;

    if (!messageIds || messageIds.length === 0) {
      return;
    }

    // Update all messages in bulk
    const result = await Message.updateMany(
      {
        _id: { $in: messageIds },
        emergencyId,
        delivered: false,
      },
      {
        delivered: true,
        deliveredAt: new Date(),
      }
    );

    logger.info('Bulk marked messages as delivered', {
      emergencyId,
      userId: user.userId,
      count: result.modifiedCount,
    });

  } catch (error: any) {
    logger.error('Error bulk marking messages as delivered', {
      emergencyId,
      userId: socket.data.user?.userId,
      error: error.message,
    });
  }
};

/**
 * Bulk mark messages as read
 */
export const bulkMarkMessagesRead = async (
  socket: Socket,
  emergencyId: string,
  messageIds: string[]
): Promise<void> => {
  try {
    const user = socket.data.user;

    if (!messageIds || messageIds.length === 0) {
      return;
    }

    // Update all messages in bulk
    const result = await Message.updateMany(
      {
        _id: { $in: messageIds },
        emergencyId,
        read: false,
      },
      {
        read: true,
        readAt: new Date(),
      }
    );

    logger.info('Bulk marked messages as read', {
      emergencyId,
      userId: user.userId,
      count: result.modifiedCount,
    });

  } catch (error: any) {
    logger.error('Error bulk marking messages as read', {
      emergencyId,
      userId: socket.data.user?.userId,
      error: error.message,
    });
  }
};

export default {
  handleMessageDelivered,
  handleMessageRead,
  bulkMarkMessagesDelivered,
  bulkMarkMessagesRead,
};
