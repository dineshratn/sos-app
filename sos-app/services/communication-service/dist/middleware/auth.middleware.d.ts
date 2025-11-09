/**
 * Authentication Middleware
 * JWT token validation for Socket.IO connections
 */
import { Socket } from 'socket.io';
export interface AuthenticatedSocket extends Socket {
    userId?: string;
    userName?: string;
    userRole?: string;
}
export interface JWTPayload {
    userId: string;
    email: string;
    name: string;
    role?: string;
    iat?: number;
    exp?: number;
}
/**
 * Middleware to authenticate Socket.IO connections
 */
export declare const authenticateSocket: (socket: AuthenticatedSocket, next: (err?: Error) => void) => Promise<void>;
/**
 * Verify user has permission to join emergency room
 */
export declare const authorizeEmergencyAccess: (userId: string, emergencyId: string, role: string) => Promise<boolean>;
/**
 * Generate JWT token (utility for testing)
 */
export declare const generateToken: (payload: Omit<JWTPayload, "iat" | "exp">) => string;
//# sourceMappingURL=auth.middleware.d.ts.map