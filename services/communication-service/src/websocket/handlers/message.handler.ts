import { Server, Socket } from 'socket.io';
import Message, { MessageType, SenderRole, MessageMetadata } from '../../models/Message';
import logger from '../../utils/logger';
import { publishMessageSentEvent } from '../../services/kafka.service';
import config from '../../config';

interface SendMessageData {
  emergencyId: string;
  type: MessageType;
  content: string;
  metadata?: MessageMetadata;
}

/**
 * Handle sending a message in emergency room
 */
export const handleSendMessage = async (
  io: Server,
  socket: Socket,
  data: SendMessageData
): Promise<void> => {
  try {
    const user = socket.data.user;
    const { emergencyId, type, content, metadata } = data;

    // Validation
    if (!emergencyId) {
      socket.emit('error', {
        code: 'INVALID_REQUEST',
        message: 'emergencyId is required',
      });
      return;
    }

    if (!content || content.trim().length === 0) {
      socket.emit('error', {
        code: 'INVALID_REQUEST',
        message: 'Message content cannot be empty',
      });
      return;
    }

    if (content.length > config.messages.maxLength) {
      socket.emit('error', {
        code: 'INVALID_REQUEST',
        message: `Message content exceeds maximum length of ${config.messages.maxLength} characters`,
      });
      return;
    }

    if (!type || !Object.values(MessageType).includes(type)) {
      socket.emit('error', {
        code: 'INVALID_REQUEST',
        message: 'Invalid message type',
      });
      return;
    }

    // Verify user is in the emergency room
    const rooms = Array.from(socket.rooms);
    if (!rooms.includes(emergencyId)) {
      socket.emit('error', {
        code: 'NOT_IN_ROOM',
        message: 'You must join the emergency room before sending messages',
      });
      return;
    }

    // Determine sender role (this would typically come from user profile or emergency relationship)
    // For now, we'll default to USER
    const senderRole = SenderRole.USER;

    // Create message in MongoDB
    const message = new Message({
      emergencyId,
      senderId: user.userId,
      senderName: user.username || user.email || 'Unknown User',
      senderRole,
      type,
      content: content.trim(),
      metadata: metadata || {},
      delivered: false,
      read: false,
    });

    await message.save();

    logger.info('Message created', {
      messageId: message._id,
      emergencyId,
      senderId: user.userId,
      type,
    });

    // Prepare message response
    const messageResponse = {
      id: message._id.toString(),
      emergencyId: message.emergencyId,
      senderId: message.senderId,
      senderName: message.senderName,
      senderRole: message.senderRole,
      type: message.type,
      content: message.content,
      metadata: message.metadata,
      delivered: message.delivered,
      read: message.read,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
    };

    // Broadcast message to all clients in the emergency room
    io.to(emergencyId).emit('message:received', messageResponse);

    // Acknowledge to sender
    socket.emit('message:sent', {
      messageId: message._id.toString(),
      timestamp: message.createdAt.toISOString(),
    });

    // Publish MessageSent event to Kafka for push notifications
    await publishMessageSentEvent(message);

    logger.info('Message broadcasted successfully', {
      messageId: message._id,
      emergencyId,
    });

  } catch (error: any) {
    logger.error('Error sending message', {
      socketId: socket.id,
      userId: socket.data.user?.userId,
      emergencyId: data.emergencyId,
      error: error.message,
      stack: error.stack,
    });

    socket.emit('error', {
      code: 'SEND_MESSAGE_FAILED',
      message: 'Failed to send message',
      details: error.message,
    });
  }
};

/**
 * Get undelivered messages for a user when they join
 */
export const getUndeliveredMessages = async (
  socket: Socket,
  emergencyId: string
): Promise<void> => {
  try {
    const messages = await Message.find({
      emergencyId,
      delivered: false,
      deletedAt: { $exists: false },
    })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    if (messages.length > 0) {
      socket.emit('messages:undelivered', {
        emergencyId,
        messages: messages.map((msg: any) => ({
          id: msg._id.toString(),
          emergencyId: msg.emergencyId,
          senderId: msg.senderId,
          senderName: msg.senderName,
          senderRole: msg.senderRole,
          type: msg.type,
          content: msg.content,
          metadata: msg.metadata,
          createdAt: msg.createdAt,
        })),
        count: messages.length,
      });

      logger.info('Undelivered messages sent', {
        emergencyId,
        userId: socket.data.user.userId,
        count: messages.length,
      });
    }

  } catch (error: any) {
    logger.error('Error fetching undelivered messages', {
      emergencyId,
      userId: socket.data.user?.userId,
      error: error.message,
    });
  }
};

export default {
  handleSendMessage,
  getUndeliveredMessages,
};
