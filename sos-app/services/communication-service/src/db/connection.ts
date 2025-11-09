/**
 * MongoDB Connection
 * Handles MongoDB connection and lifecycle
 */

import mongoose from 'mongoose';
import logger from '../utils/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sos-communication';

export class MongoDBConnection {
  private static instance: MongoDBConnection;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): MongoDBConnection {
    if (!MongoDBConnection.instance) {
      MongoDBConnection.instance = new MongoDBConnection();
    }
    return MongoDBConnection.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('MongoDB: Already connected');
      return;
    }

    try {
      await mongoose.connect(MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      });

      this.isConnected = true;
      logger.info('MongoDB: Connected successfully');

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB: Disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB: Reconnected');
        this.isConnected = true;
      });

    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info('MongoDB: Disconnected successfully');
    } catch (error) {
      logger.error('MongoDB disconnect error:', error);
      throw error;
    }
  }

  getConnection() {
    return mongoose.connection;
  }

  isConnectedStatus(): boolean {
    return this.isConnected;
  }
}

export default MongoDBConnection.getInstance();
