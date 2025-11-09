/**
 * Participant Model
 * Represents a user participating in an emergency room
 */
export interface Participant {
    userId: string;
    socketId: string;
    name: string;
    role: ParticipantRole;
    joinedAt: Date;
    lastSeenAt: Date;
    isOnline: boolean;
}
export declare enum ParticipantRole {
    USER = "USER",
    CONTACT = "CONTACT",
    RESPONDER = "RESPONDER",
    ADMIN = "ADMIN"
}
export interface JoinRoomRequest {
    emergencyId: string;
    userId: string;
    name: string;
    role: ParticipantRole;
}
export interface JoinRoomResponse {
    success: boolean;
    message: string;
    participant?: Participant;
    participants?: Participant[];
    roomInfo?: RoomInfo;
}
export interface RoomInfo {
    emergencyId: string;
    participantCount: number;
    createdAt: Date;
    status: EmergencyStatus;
}
export declare enum EmergencyStatus {
    PENDING = "PENDING",
    ACTIVE = "ACTIVE",
    CANCELLED = "CANCELLED",
    RESOLVED = "RESOLVED"
}
export interface LeaveRoomRequest {
    emergencyId: string;
    userId: string;
}
export interface RoomEvent {
    event: 'user:joined' | 'user:left' | 'user:updated';
    emergencyId: string;
    participant: Participant;
    timestamp: Date;
}
//# sourceMappingURL=participant.model.d.ts.map