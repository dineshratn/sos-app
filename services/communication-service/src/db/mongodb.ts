import mongoose from 'mongoose';
import config from '../config';
import logger from '../utils/logger';
import { initializeMessageCollection } from './schemas/message.schema';

export const connectMongoDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongodb.uri, {
      maxPoolSize: config.mongodb.maxPoolSize,
    });
    logger.info('MongoDB connected successfully', {
      uri: config.mongodb.uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'), // Hide credentials in logs
    });

    // Initialize message collection with indexes
    await initializeMessageCollection();
  } catch (error) {
    logger.error('MongoDB connection error', { error });
    process.exit(1);
  }
};

mongoose.connection.on('error', (error) => {
  logger.error('MongoDB connection error', { error });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

export default mongoose;
