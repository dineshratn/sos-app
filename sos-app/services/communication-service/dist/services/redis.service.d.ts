/**
 * Redis Service
 * Handles Redis operations for presence tracking and room management
 */
import { Participant } from '../models/participant.model';
export declare class RedisService {
    private client;
    isConnected: boolean;
    constructor();
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    /**
     * Add a participant to an emergency room
     */
    addParticipantToRoom(emergencyId: string, participant: Participant): Promise<void>;
    /**
     * Remove a participant from an emergency room
     */
    removeParticipantFromRoom(emergencyId: string, userId: string): Promise<void>;
    /**
     * Get all participants in a room
     */
    getRoomParticipants(emergencyId: string): Promise<Participant[]>;
    /**
     * Get participant count in a room
     */
    getRoomParticipantCount(emergencyId: string): Promise<number>;
    /**
     * Check if user is in a room
     */
    isUserInRoom(emergencyId: string, userId: string): Promise<boolean>;
    /**
     * Update participant's last seen timestamp
     */
    updateParticipantLastSeen(emergencyId: string, userId: string): Promise<void>;
    /**
     * Update participant's online status
     */
    updateParticipantOnlineStatus(emergencyId: string, userId: string, isOnline: boolean): Promise<void>;
    /**
     * Get participant by user ID
     */
    getParticipant(emergencyId: string, userId: string): Promise<Participant | null>;
    /**
     * Clean up expired rooms
     */
    cleanupExpiredRooms(): Promise<void>;
}
declare const _default: RedisService;
export default _default;
//# sourceMappingURL=redis.service.d.ts.map