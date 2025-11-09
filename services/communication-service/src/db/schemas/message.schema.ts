import Message from '../../models/Message';
import logger from '../../utils/logger';

/**
 * Initialize message collection with proper indexes and configuration
 * This ensures the collection is created with all necessary indexes for optimal performance
 */
export const initializeMessageCollection = async (): Promise<void> => {
  try {
    // Get the collection
    const collection = Message.collection;

    // Check if collection exists
    const collections = await Message.db.listCollections({ name: 'messages' }).toArray();

    if (collections.length === 0) {
      logger.info('Creating messages collection...');
      await Message.createCollection();
    }

    // Ensure all indexes are created
    logger.info('Creating indexes for messages collection...');

    // Single field indexes
    await collection.createIndex({ emergencyId: 1 }, { background: true });
    await collection.createIndex({ senderId: 1 }, { background: true });
    await collection.createIndex({ delivered: 1 }, { background: true });
    await collection.createIndex({ read: 1 }, { background: true });
    await collection.createIndex({ deletedAt: 1 }, { background: true });

    // Compound indexes for efficient queries
    await collection.createIndex(
      { emergencyId: 1, createdAt: -1 },
      { background: true, name: 'emergency_created_idx' }
    );

    await collection.createIndex(
      { emergencyId: 1, delivered: 1 },
      { background: true, name: 'emergency_delivered_idx' }
    );

    await collection.createIndex(
      { emergencyId: 1, read: 1 },
      { background: true, name: 'emergency_read_idx' }
    );

    // TTL index to automatically delete messages after 90 days
    await collection.createIndex(
      { createdAt: 1 },
      {
        expireAfterSeconds: 90 * 24 * 60 * 60, // 90 days in seconds
        background: true,
        name: 'message_ttl_idx',
      }
    );

    logger.info('Message collection indexes created successfully');

    // Log current indexes
    const indexes = await collection.indexes();
    logger.info('Current message collection indexes', {
      count: indexes.length,
      indexes: indexes.map(idx => ({ name: idx.name, keys: idx.key }))
    });

  } catch (error) {
    logger.error('Failed to initialize message collection', { error });
    throw error;
  }
};

/**
 * Collection schema validation rules
 * MongoDB schema validation for data integrity
 */
export const messageSchemaValidation = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['emergencyId', 'senderId', 'senderName', 'senderRole', 'type', 'content'],
    properties: {
      emergencyId: {
        bsonType: 'string',
        description: 'Emergency ID - required string',
      },
      senderId: {
        bsonType: 'string',
        description: 'Sender user ID - required string',
      },
      senderName: {
        bsonType: 'string',
        description: 'Sender display name - required string',
      },
      senderRole: {
        enum: ['USER', 'CONTACT', 'RESPONDER'],
        description: 'Role of the message sender',
      },
      type: {
        enum: ['TEXT', 'VOICE', 'IMAGE', 'VIDEO', 'LOCATION', 'QUICK_RESPONSE'],
        description: 'Type of message',
      },
      content: {
        bsonType: 'string',
        maxLength: 5000,
        description: 'Message content - max 5000 characters',
      },
      metadata: {
        bsonType: 'object',
        description: 'Additional message metadata',
        properties: {
          mediaUrl: { bsonType: 'string' },
          thumbnailUrl: { bsonType: 'string' },
          transcription: { bsonType: 'string' },
          duration: { bsonType: 'number' },
          fileSize: { bsonType: 'number' },
          mimeType: { bsonType: 'string' },
          location: {
            bsonType: 'object',
            properties: {
              latitude: { bsonType: 'double' },
              longitude: { bsonType: 'double' },
              accuracy: { bsonType: 'double' },
            },
          },
          quickResponseType: {
            enum: [
              'NEED_AMBULANCE',
              'NEED_POLICE',
              'NEED_FIRE',
              'TRAPPED',
              'INJURED',
              'SAFE_NOW',
              'CALL_ME',
            ],
          },
        },
      },
      delivered: {
        bsonType: 'bool',
        description: 'Whether message has been delivered',
      },
      read: {
        bsonType: 'bool',
        description: 'Whether message has been read',
      },
      deliveredAt: {
        bsonType: 'date',
        description: 'Timestamp when message was delivered',
      },
      readAt: {
        bsonType: 'date',
        description: 'Timestamp when message was read',
      },
      createdAt: {
        bsonType: 'date',
        description: 'Message creation timestamp',
      },
      updatedAt: {
        bsonType: 'date',
        description: 'Message update timestamp',
      },
      deletedAt: {
        bsonType: 'date',
        description: 'Soft delete timestamp',
      },
    },
  },
};

/**
 * Apply schema validation to existing collection
 */
export const applyMessageSchemaValidation = async (): Promise<void> => {
  try {
    await Message.db.command({
      collMod: 'messages',
      validator: messageSchemaValidation,
      validationLevel: 'moderate', // Only validate inserts and updates
      validationAction: 'error', // Reject documents that don't match schema
    });

    logger.info('Message schema validation applied successfully');
  } catch (error) {
    logger.error('Failed to apply message schema validation', { error });
    // Don't throw - validation is optional, indexes are more critical
  }
};

/**
 * Get collection statistics
 */
export const getMessageCollectionStats = async (): Promise<any> => {
  try {
    const stats = await Message.db.command({ collStats: 'messages' });
    return {
      count: stats.count,
      size: stats.size,
      avgObjSize: stats.avgObjSize,
      storageSize: stats.storageSize,
      indexes: stats.nindexes,
      totalIndexSize: stats.totalIndexSize,
    };
  } catch (error) {
    logger.error('Failed to get message collection stats', { error });
    return null;
  }
};

export default {
  initializeMessageCollection,
  applyMessageSchemaValidation,
  messageSchemaValidation,
  getMessageCollectionStats,
};
