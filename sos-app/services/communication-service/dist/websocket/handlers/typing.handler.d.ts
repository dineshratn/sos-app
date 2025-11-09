/**
 * Typing Indicator Handler
 * Task 131: Handle typing:start and typing:stop events with 3-second debounce
 */
import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../../middleware/auth.middleware';
export declare class TypingHandler {
    private typingTimers;
    private readonly TYPING_TIMEOUT;
    constructor(_io: Server);
    /**
     * Handle typing:start event
     * Broadcasts to other users in the room and auto-stops after 3 seconds
     */
    handleTypingStart(socket: AuthenticatedSocket, data: {
        emergencyId: string;
        userId: string;
    }): void;
    /**
     * Handle typing:stop event
     * Broadcasts to other users that typing has stopped
     */
    handleTypingStop(socket: AuthenticatedSocket, data: {
        emergencyId: string;
        userId: string;
    }): void;
    /**
     * Auto-stop typing after timeout
     */
    private autoStopTyping;
    /**
     * Clean up typing timers for a user (called on disconnect)
     */
    cleanupUserTimers(userId: string): void;
    /**
     * Clean up typing timers for a room
     */
    cleanupRoomTimers(emergencyId: string): void;
    /**
     * Register all typing-related event handlers
     */
    registerHandlers(socket: AuthenticatedSocket): void;
}
//# sourceMappingURL=typing.handler.d.ts.map