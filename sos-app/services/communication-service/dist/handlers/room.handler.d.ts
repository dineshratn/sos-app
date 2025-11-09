/**
 * Room Handler
 * Handles Socket.IO events for joining/leaving emergency rooms
 * Requirement 8.0.1: Communication During Emergencies
 */
import { Server } from 'socket.io';
import { Participant, JoinRoomRequest, JoinRoomResponse, LeaveRoomRequest } from '../models/participant.model';
import { AuthenticatedSocket } from '../middleware/auth.middleware';
export declare class RoomHandler {
    constructor(_io: Server);
    /**
     * Handle user joining an emergency room
     * This is the main implementation for Task 127
     */
    handleJoinRoom(socket: AuthenticatedSocket, data: JoinRoomRequest, callback: (response: JoinRoomResponse) => void): Promise<void>;
    /**
     * Handle user leaving an emergency room
     */
    handleLeaveRoom(socket: AuthenticatedSocket, data: LeaveRoomRequest, callback?: (response: {
        success: boolean;
        message: string;
    }) => void): Promise<void>;
    /**
     * Handle socket disconnection
     */
    handleDisconnect(socket: AuthenticatedSocket): Promise<void>;
    /**
     * Get online participants in a room
     */
    handleGetOnlineParticipants(_socket: AuthenticatedSocket, data: {
        emergencyId: string;
    }, callback: (response: {
        success: boolean;
        participants?: Participant[];
        message?: string;
    }) => void): Promise<void>;
    /**
     * Update participant's last seen timestamp
     */
    handleUpdateLastSeen(socket: AuthenticatedSocket, data: {
        emergencyId: string;
        userId: string;
    }): Promise<void>;
    /**
     * Register all room-related event handlers
     */
    registerHandlers(socket: AuthenticatedSocket): void;
}
//# sourceMappingURL=room.handler.d.ts.map