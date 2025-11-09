"use strict";
/**
 * Redis Service
 * Handles Redis operations for presence tracking and room management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const redis_1 = require("redis");
const logger_1 = __importDefault(require("../utils/logger"));
class RedisService {
    constructor() {
        this.isConnected = false;
        this.client = (0, redis_1.createClient)({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        logger_1.default.error('Redis: Max reconnection attempts reached');
                        return new Error('Max reconnection attempts reached');
                    }
                    return Math.min(retries * 100, 3000);
                }
            }
        });
        this.client.on('error', (err) => {
            logger_1.default.error('Redis Client Error:', err);
        });
        this.client.on('connect', () => {
            logger_1.default.info('Redis: Connected successfully');
            this.isConnected = true;
        });
        this.client.on('disconnect', () => {
            logger_1.default.warn('Redis: Disconnected');
            this.isConnected = false;
        });
    }
    async connect() {
        try {
            await this.client.connect();
            logger_1.default.info('Redis service initialized');
        }
        catch (error) {
            logger_1.default.error('Failed to connect to Redis:', error);
            throw error;
        }
    }
    async disconnect() {
        try {
            await this.client.quit();
            logger_1.default.info('Redis service disconnected');
        }
        catch (error) {
            logger_1.default.error('Error disconnecting from Redis:', error);
        }
    }
    /**
     * Add a participant to an emergency room
     */
    async addParticipantToRoom(emergencyId, participant) {
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
            logger_1.default.info(`Participant ${participant.userId} added to room ${emergencyId}`);
        }
        catch (error) {
            logger_1.default.error('Error adding participant to room:', error);
            throw error;
        }
    }
    /**
     * Remove a participant from an emergency room
     */
    async removeParticipantFromRoom(emergencyId, userId) {
        try {
            const roomKey = `room:${emergencyId}:participants`;
            const participantKey = `participant:${userId}:${emergencyId}`;
            // Remove from room set
            await this.client.sRem(roomKey, userId);
            // Delete participant data
            await this.client.del(participantKey);
            logger_1.default.info(`Participant ${userId} removed from room ${emergencyId}`);
        }
        catch (error) {
            logger_1.default.error('Error removing participant from room:', error);
            throw error;
        }
    }
    /**
     * Get all participants in a room
     */
    async getRoomParticipants(emergencyId) {
        try {
            const roomKey = `room:${emergencyId}:participants`;
            const userIds = await this.client.sMembers(roomKey);
            const participants = [];
            for (const userId of userIds) {
                const participantKey = `participant:${userId}:${emergencyId}`;
                const data = await this.client.hGetAll(participantKey);
                if (data && Object.keys(data).length > 0) {
                    participants.push({
                        userId: data.userId,
                        socketId: data.socketId,
                        name: data.name,
                        role: data.role,
                        joinedAt: new Date(data.joinedAt),
                        lastSeenAt: new Date(data.lastSeenAt),
                        isOnline: data.isOnline === 'true'
                    });
                }
            }
            return participants;
        }
        catch (error) {
            logger_1.default.error('Error getting room participants:', error);
            throw error;
        }
    }
    /**
     * Get participant count in a room
     */
    async getRoomParticipantCount(emergencyId) {
        try {
            const roomKey = `room:${emergencyId}:participants`;
            return await this.client.sCard(roomKey);
        }
        catch (error) {
            logger_1.default.error('Error getting room participant count:', error);
            throw error;
        }
    }
    /**
     * Check if user is in a room
     */
    async isUserInRoom(emergencyId, userId) {
        try {
            const roomKey = `room:${emergencyId}:participants`;
            const isMember = await this.client.sIsMember(roomKey, userId);
            return Boolean(isMember);
        }
        catch (error) {
            logger_1.default.error('Error checking if user is in room:', error);
            throw error;
        }
    }
    /**
     * Update participant's last seen timestamp
     */
    async updateParticipantLastSeen(emergencyId, userId) {
        try {
            const participantKey = `participant:${userId}:${emergencyId}`;
            await this.client.hSet(participantKey, 'lastSeenAt', new Date().toISOString());
        }
        catch (error) {
            logger_1.default.error('Error updating participant last seen:', error);
            throw error;
        }
    }
    /**
     * Update participant's online status
     */
    async updateParticipantOnlineStatus(emergencyId, userId, isOnline) {
        try {
            const participantKey = `participant:${userId}:${emergencyId}`;
            await this.client.hSet(participantKey, {
                isOnline: isOnline.toString(),
                lastSeenAt: new Date().toISOString()
            });
        }
        catch (error) {
            logger_1.default.error('Error updating participant online status:', error);
            throw error;
        }
    }
    /**
     * Get participant by user ID
     */
    async getParticipant(emergencyId, userId) {
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
                role: data.role,
                joinedAt: new Date(data.joinedAt),
                lastSeenAt: new Date(data.lastSeenAt),
                isOnline: data.isOnline === 'true'
            };
        }
        catch (error) {
            logger_1.default.error('Error getting participant:', error);
            throw error;
        }
    }
    /**
     * Clean up expired rooms
     */
    async cleanupExpiredRooms() {
        // This would typically be handled by Redis TTL
        // Additional cleanup logic can be added here if needed
        logger_1.default.info('Cleanup expired rooms triggered');
    }
}
exports.RedisService = RedisService;
exports.default = new RedisService();
//# sourceMappingURL=redis.service.js.map