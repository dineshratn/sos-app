/**
 * Redis Service
 * Handles Redis operations for presence tracking and room management
 */

import { createClient, RedisClientType } from 'redis';
import { Participant } from '../models/participant.model';
import logger from '../utils/logger';

export class RedisService {
  private client: RedisClientType;
  public isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis: Max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      logger.info('Redis: Connected successfully');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis: Disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('Redis service initialized');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      logger.info('Redis service disconnected');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }

  /**
   * Add a participant to an emergency room
   */
  async addParticipantToRoom(emergencyId: string, participant: Participant): Promise<void> {
    try {
      const roomKey = `room:${emergencyId}:participants`;
      const participantKey = `participant:${participant.userId}:${emergencyId}`;

      // Store participant data
      await this.client.hSet(participantKey, {
        userId: participant.userId,
        socketId: participant.socketId,
        name: participant.name,
        role: participant.role,
        joinedAt: participant.joinedAt.toISOString(),
        lastSeenAt: participant.lastSeenAt.toISOString(),
        isOnline: participant.isOnline.toString()
      });

      // Add participant to room set
      await this.client.sAdd(roomKey, participant.userId);

      // Set expiry (24 hours)
      await this.client.expire(participantKey, 86400);
      await this.client.expire(roomKey, 86400);

      logger.info(`Participant ${participant.userId} added to room ${emergencyId}`);
    } catch (error) {
      logger.error('Error adding participant to room:', error);
      throw error;
    }
  }

  /**
   * Remove a participant from an emergency room
   */
  async removeParticipantFromRoom(emergencyId: string, userId: string): Promise<void> {
    try {
      const roomKey = `room:${emergencyId}:participants`;
      const participantKey = `participant:${userId}:${emergencyId}`;

      // Remove from room set
      await this.client.sRem(roomKey, userId);

      // Delete participant data
      await this.client.del(participantKey);

      logger.info(`Participant ${userId} removed from room ${emergencyId}`);
    } catch (error) {
      logger.error('Error removing participant from room:', error);
      throw error;
    }
  }

  /**
   * Get all participants in a room
   */
  async getRoomParticipants(emergencyId: string): Promise<Participant[]> {
    try {
      const roomKey = `room:${emergencyId}:participants`;
      const userIds = await this.client.sMembers(roomKey);

      const participants: Participant[] = [];

      for (const userId of userIds) {
        const participantKey = `participant:${userId}:${emergencyId}`;
        const data = await this.client.hGetAll(participantKey);

        if (data && Object.keys(data).length > 0) {
          participants.push({
            userId: data.userId,
            socketId: data.socketId,
            name: data.name,
            role: data.role as any,
            joinedAt: new Date(data.joinedAt),
            lastSeenAt: new Date(data.lastSeenAt),
            isOnline: data.isOnline === 'true'
          });
        }
      }

      return participants;
    } catch (error) {
      logger.error('Error getting room participants:', error);
      throw error;
    }
  }

  /**
   * Get participant count in a room
   */
  async getRoomParticipantCount(emergencyId: string): Promise<number> {
    try {
      const roomKey = `room:${emergencyId}:participants`;
      return await this.client.sCard(roomKey);
    } catch (error) {
      logger.error('Error getting room participant count:', error);
      throw error;
    }
  }

  /**
   * Check if user is in a room
   */
  async isUserInRoom(emergencyId: string, userId: string): Promise<boolean> {
    try {
      const roomKey = `room:${emergencyId}:participants`;
      const isMember = await this.client.sIsMember(roomKey, userId);
      return Boolean(isMember);
    } catch (error) {
      logger.error('Error checking if user is in room:', error);
      throw error;
    }
  }

  /**
   * Update participant's last seen timestamp
   */
  async updateParticipantLastSeen(emergencyId: string, userId: string): Promise<void> {
    try {
      const participantKey = `participant:${userId}:${emergencyId}`;
      await this.client.hSet(participantKey, 'lastSeenAt', new Date().toISOString());
    } catch (error) {
      logger.error('Error updating participant last seen:', error);
      throw error;
    }
  }

  /**
   * Update participant's online status
   */
  async updateParticipantOnlineStatus(
    emergencyId: string,
    userId: string,
    isOnline: boolean
  ): Promise<void> {
    try {
      const participantKey = `participant:${userId}:${emergencyId}`;
      await this.client.hSet(participantKey, {
        isOnline: isOnline.toString(),
        lastSeenAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error updating participant online status:', error);
      throw error;
    }
  }

  /**
   * Get participant by user ID
   */
  async getParticipant(emergencyId: string, userId: string): Promise<Participant | null> {
    try {
      const participantKey = `participant:${userId}:${emergencyId}`;
      const data = await this.client.hGetAll(participantKey);

      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      return {
        userId: data.userId,
        socketId: data.socketId,
        name: data.name,
        role: data.role as any,
        joinedAt: new Date(data.joinedAt),
        lastSeenAt: new Date(data.lastSeenAt),
        isOnline: data.isOnline === 'true'
      };
    } catch (error) {
      logger.error('Error getting participant:', error);
      throw error;
    }
  }

  /**
   * Clean up expired rooms
   */
  async cleanupExpiredRooms(): Promise<void> {
    // This would typically be handled by Redis TTL
    // Additional cleanup logic can be added here if needed
    logger.info('Cleanup expired rooms triggered');
  }
}

export default new RedisService();
