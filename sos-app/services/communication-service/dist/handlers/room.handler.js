"use strict";
/**
 * Room Handler
 * Handles Socket.IO events for joining/leaving emergency rooms
 * Requirement 8.0.1: Communication During Emergencies
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomHandler = void 0;
const participant_model_1 = require("../models/participant.model");
const redis_service_1 = __importDefault(require("../services/redis.service"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const logger_1 = __importDefault(require("../utils/logger"));
class RoomHandler {
    constructor(_io) {
        // io parameter reserved for future use
    }
    /**
     * Handle user joining an emergency room
     * This is the main implementation for Task 127
     */
    async handleJoinRoom(socket, data, callback) {
        try {
            const { emergencyId, userId, name, role } = data;
            // Validate required fields
            if (!emergencyId || !userId || !name || !role) {
                logger_1.default.warn(`Join room failed: Missing required fields from socket ${socket.id}`);
                return callback({
                    success: false,
                    message: 'Missing required fields: emergencyId, userId, name, or role'
                });
            }
            // Validate user is authenticated and matches userId
            if (socket.userId !== userId) {
                logger_1.default.warn(`Join room failed: User ID mismatch. Socket user: ${socket.userId}, Request user: ${userId}`);
                return callback({
                    success: false,
                    message: 'Unauthorized: User ID mismatch'
                });
            }
            // Validate role
            if (!Object.values(participant_model_1.ParticipantRole).includes(role)) {
                logger_1.default.warn(`Join room failed: Invalid role ${role}`);
                return callback({
                    success: false,
                    message: `Invalid role. Must be one of: ${Object.values(participant_model_1.ParticipantRole).join(', ')}`
                });
            }
            // Authorize user access to emergency room
            const hasAccess = await (0, auth_middleware_1.authorizeEmergencyAccess)(userId, emergencyId, role);
            if (!hasAccess) {
                logger_1.default.warn(`Join room failed: User ${userId} not authorized for emergency ${emergencyId}`);
                return callback({
                    success: false,
                    message: 'Unauthorized: You do not have access to this emergency room'
                });
            }
            // Check if user is already in the room
            const isAlreadyInRoom = await redis_service_1.default.isUserInRoom(emergencyId, userId);
            if (isAlreadyInRoom) {
                logger_1.default.info(`User ${userId} is already in room ${emergencyId}, updating connection`);
                // Update existing participant's socket and status
                await redis_service_1.default.updateParticipantOnlineStatus(emergencyId, userId, true);
                // Get updated participant data
                const participant = await redis_service_1.default.getParticipant(emergencyId, userId);
                // Join the Socket.IO room
                await socket.join(emergencyId);
                // Get all participants
                const participants = await redis_service_1.default.getRoomParticipants(emergencyId);
                return callback({
                    success: true,
                    message: 'Reconnected to emergency room',
                    participant: participant || undefined,
                    participants
                });
            }
            // Create participant object
            const participant = {
                userId,
                socketId: socket.id,
                name,
                role,
                joinedAt: new Date(),
                lastSeenAt: new Date(),
                isOnline: true
            };
            // Add participant to Redis
            await redis_service_1.default.addParticipantToRoom(emergencyId, participant);
            // Join the Socket.IO room
            await socket.join(emergencyId);
            // Get all participants in the room
            const participants = await redis_service_1.default.getRoomParticipants(emergencyId);
            const participantCount = participants.length;
            // Broadcast to other users in the room that a new user joined
            const joinEvent = {
                event: 'user:joined',
                emergencyId,
                participant,
                timestamp: new Date()
            };
            socket.to(emergencyId).emit('user:joined', joinEvent);
            // Log successful join
            logger_1.default.info(`User ${userId} (${name}) joined emergency room ${emergencyId} as ${role}. ` +
                `Total participants: ${participantCount}`);
            // Send success response with room information
            callback({
                success: true,
                message: 'Successfully joined emergency room',
                participant,
                participants,
                roomInfo: {
                    emergencyId,
                    participantCount,
                    createdAt: new Date(),
                    status: participant_model_1.EmergencyStatus.ACTIVE // In production, fetch from emergency service
                }
            });
        }
        catch (error) {
            logger_1.default.error('Error in handleJoinRoom:', error);
            callback({
                success: false,
                message: 'An error occurred while joining the room. Please try again.'
            });
        }
    }
    /**
     * Handle user leaving an emergency room
     */
    async handleLeaveRoom(socket, data, callback) {
        try {
            const { emergencyId, userId } = data;
            // Validate required fields
            if (!emergencyId || !userId) {
                logger_1.default.warn(`Leave room failed: Missing required fields from socket ${socket.id}`);
                if (callback) {
                    callback({
                        success: false,
                        message: 'Missing required fields: emergencyId or userId'
                    });
                }
                return;
            }
            // Validate user is authenticated and matches userId
            if (socket.userId !== userId) {
                logger_1.default.warn(`Leave room failed: User ID mismatch. Socket user: ${socket.userId}, Request user: ${userId}`);
                if (callback) {
                    callback({
                        success: false,
                        message: 'Unauthorized: User ID mismatch'
                    });
                }
                return;
            }
            // Get participant data before removal
            const participant = await redis_service_1.default.getParticipant(emergencyId, userId);
            // Remove participant from Redis
            await redis_service_1.default.removeParticipantFromRoom(emergencyId, userId);
            // Leave the Socket.IO room
            await socket.leave(emergencyId);
            // Broadcast to other users that this user left
            if (participant) {
                const leaveEvent = {
                    event: 'user:left',
                    emergencyId,
                    participant,
                    timestamp: new Date()
                };
                socket.to(emergencyId).emit('user:left', leaveEvent);
            }
            // Get updated participant count
            const participantCount = await redis_service_1.default.getRoomParticipantCount(emergencyId);
            logger_1.default.info(`User ${userId} left emergency room ${emergencyId}. ` +
                `Remaining participants: ${participantCount}`);
            if (callback) {
                callback({
                    success: true,
                    message: 'Successfully left emergency room'
                });
            }
        }
        catch (error) {
            logger_1.default.error('Error in handleLeaveRoom:', error);
            if (callback) {
                callback({
                    success: false,
                    message: 'An error occurred while leaving the room. Please try again.'
                });
            }
        }
    }
    /**
     * Handle socket disconnection
     */
    async handleDisconnect(socket) {
        try {
            const userId = socket.userId;
            if (!userId) {
                logger_1.default.warn(`Socket ${socket.id} disconnected without userId`);
                return;
            }
            logger_1.default.info(`Socket ${socket.id} disconnected for user ${userId}`);
            // Mark user as offline in all rooms they're in
            // In production, we'd track which rooms the socket is in
            // For now, we'll handle cleanup via Redis TTL and periodic cleanup jobs
            // Note: In a full implementation, we might want to:
            // 1. Track all rooms a socket has joined
            // 2. Update online status to false for each room
            // 3. Broadcast offline status to room participants
            // 4. Clean up after a grace period (in case of reconnection)
        }
        catch (error) {
            logger_1.default.error('Error in handleDisconnect:', error);
        }
    }
    /**
     * Get online participants in a room
     */
    async handleGetOnlineParticipants(_socket, data, callback) {
        try {
            const { emergencyId } = data;
            if (!emergencyId) {
                return callback({
                    success: false,
                    message: 'Missing emergencyId'
                });
            }
            // Get all participants
            const participants = await redis_service_1.default.getRoomParticipants(emergencyId);
            logger_1.default.info(`Retrieved ${participants.length} participants for room ${emergencyId}`);
            callback({
                success: true,
                participants
            });
        }
        catch (error) {
            logger_1.default.error('Error in handleGetOnlineParticipants:', error);
            callback({
                success: false,
                message: 'An error occurred while fetching participants'
            });
        }
    }
    /**
     * Update participant's last seen timestamp
     */
    async handleUpdateLastSeen(socket, data) {
        try {
            const { emergencyId, userId } = data;
            if (!emergencyId || !userId || socket.userId !== userId) {
                return;
            }
            await redis_service_1.default.updateParticipantLastSeen(emergencyId, userId);
        }
        catch (error) {
            logger_1.default.error('Error in handleUpdateLastSeen:', error);
        }
    }
    /**
     * Register all room-related event handlers
     */
    registerHandlers(socket) {
        // Join room handler
        socket.on('room:join', (data, callback) => {
            this.handleJoinRoom(socket, data, callback);
        });
        // Leave room handler
        socket.on('room:leave', (data, callback) => {
            this.handleLeaveRoom(socket, data, callback);
        });
        // Get online participants handler
        socket.on('room:get-participants', (data, callback) => {
            this.handleGetOnlineParticipants(socket, data, callback);
        });
        // Update last seen handler
        socket.on('room:update-last-seen', (data) => {
            this.handleUpdateLastSeen(socket, data);
        });
        // Disconnect handler
        socket.on('disconnect', () => {
            this.handleDisconnect(socket);
        });
        logger_1.default.info(`Room handlers registered for socket ${socket.id}`);
    }
}
exports.RoomHandler = RoomHandler;
//# sourceMappingURL=room.handler.js.map