"use strict";
/**
 * Typing Indicator Handler
 * Task 131: Handle typing:start and typing:stop events with 3-second debounce
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypingHandler = void 0;
const logger_1 = __importDefault(require("../../utils/logger"));
class TypingHandler {
    constructor(_io) {
        this.TYPING_TIMEOUT = 3000; // 3 seconds
        // io parameter reserved for future use
        this.typingTimers = new Map();
    }
    /**
     * Handle typing:start event
     * Broadcasts to other users in the room and auto-stops after 3 seconds
     */
    handleTypingStart(socket, data) {
        try {
            const { emergencyId, userId } = data;
            // Validate required fields
            if (!emergencyId || !userId) {
                logger_1.default.warn(`Typing start failed: Missing required fields from socket ${socket.id}`);
                return;
            }
            // Verify user is authenticated and matches userId
            if (socket.userId !== userId) {
                logger_1.default.warn(`Typing start failed: User ID mismatch. Socket user: ${socket.userId}, Request user: ${userId}`);
                return;
            }
            const timerKey = `${userId}:${emergencyId}`;
            // Clear any existing timer for this user in this room
            if (this.typingTimers.has(timerKey)) {
                clearTimeout(this.typingTimers.get(timerKey));
            }
            // Create typing event
            const typingEvent = {
                emergencyId,
                userId,
                userName: socket.userName || 'User',
                isTyping: true,
                timestamp: new Date()
            };
            // Broadcast to other users in the room (exclude sender)
            socket.to(emergencyId).emit('typing:start', typingEvent);
            logger_1.default.debug(`User ${userId} started typing in room ${emergencyId}`);
            // Set auto-stop timer (3 seconds)
            const timer = setTimeout(() => {
                this.autoStopTyping(socket, emergencyId, userId);
                this.typingTimers.delete(timerKey);
            }, this.TYPING_TIMEOUT);
            this.typingTimers.set(timerKey, timer);
        }
        catch (error) {
            logger_1.default.error('Error in handleTypingStart:', error);
        }
    }
    /**
     * Handle typing:stop event
     * Broadcasts to other users that typing has stopped
     */
    handleTypingStop(socket, data) {
        try {
            const { emergencyId, userId } = data;
            // Validate required fields
            if (!emergencyId || !userId) {
                logger_1.default.warn(`Typing stop failed: Missing required fields from socket ${socket.id}`);
                return;
            }
            // Verify user is authenticated and matches userId
            if (socket.userId !== userId) {
                logger_1.default.warn(`Typing stop failed: User ID mismatch. Socket user: ${socket.userId}, Request user: ${userId}`);
                return;
            }
            const timerKey = `${userId}:${emergencyId}`;
            // Clear any existing timer
            if (this.typingTimers.has(timerKey)) {
                clearTimeout(this.typingTimers.get(timerKey));
                this.typingTimers.delete(timerKey);
            }
            // Create typing event
            const typingEvent = {
                emergencyId,
                userId,
                userName: socket.userName || 'User',
                isTyping: false,
                timestamp: new Date()
            };
            // Broadcast to other users in the room (exclude sender)
            socket.to(emergencyId).emit('typing:stop', typingEvent);
            logger_1.default.debug(`User ${userId} stopped typing in room ${emergencyId}`);
        }
        catch (error) {
            logger_1.default.error('Error in handleTypingStop:', error);
        }
    }
    /**
     * Auto-stop typing after timeout
     */
    autoStopTyping(socket, emergencyId, userId) {
        try {
            const typingEvent = {
                emergencyId,
                userId,
                userName: socket.userName || 'User',
                isTyping: false,
                timestamp: new Date()
            };
            // Broadcast to room
            socket.to(emergencyId).emit('typing:stop', typingEvent);
            logger_1.default.debug(`Auto-stopped typing for user ${userId} in room ${emergencyId}`);
        }
        catch (error) {
            logger_1.default.error('Error in autoStopTyping:', error);
        }
    }
    /**
     * Clean up typing timers for a user (called on disconnect)
     */
    cleanupUserTimers(userId) {
        const keysToDelete = [];
        this.typingTimers.forEach((timer, key) => {
            if (key.startsWith(`${userId}:`)) {
                clearTimeout(timer);
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach((key) => {
            this.typingTimers.delete(key);
        });
        if (keysToDelete.length > 0) {
            logger_1.default.debug(`Cleaned up ${keysToDelete.length} typing timers for user ${userId}`);
        }
    }
    /**
     * Clean up typing timers for a room
     */
    cleanupRoomTimers(emergencyId) {
        const keysToDelete = [];
        this.typingTimers.forEach((timer, key) => {
            if (key.endsWith(`:${emergencyId}`)) {
                clearTimeout(timer);
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach((key) => {
            this.typingTimers.delete(key);
        });
        if (keysToDelete.length > 0) {
            logger_1.default.debug(`Cleaned up ${keysToDelete.length} typing timers for room ${emergencyId}`);
        }
    }
    /**
     * Register all typing-related event handlers
     */
    registerHandlers(socket) {
        // Typing start handler
        socket.on('typing:start', (data) => {
            this.handleTypingStart(socket, data);
        });
        // Typing stop handler
        socket.on('typing:stop', (data) => {
            this.handleTypingStop(socket, data);
        });
        // Cleanup on disconnect
        socket.on('disconnect', () => {
            if (socket.userId) {
                this.cleanupUserTimers(socket.userId);
            }
        });
        logger_1.default.info(`Typing handlers registered for socket ${socket.id}`);
    }
}
exports.TypingHandler = TypingHandler;
//# sourceMappingURL=typing.handler.js.map