import { Request, Response, NextFunction } from 'express';
export interface TokenPayload {
    userId: string;
    email: string;
    sessionId: string;
    type: 'access' | 'refresh';
    iat: number;
    exp: number;
}
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
                sessionId: string;
            };
        }
    }
}
/**
 * Middleware to validate JWT access token
 * Adds user info to req.user
 */
export declare const authenticateToken: (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Optional authentication - doesn't fail if no token
 * Used for endpoints that work both authenticated and unauthenticated
 */
export declare const optionalAuth: (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Extract user ID from token without full validation
 * Used for logging and metrics
 */
export declare const extractUserId: (req: Request) => string | null;
/**
 * Verify JWT token directly (for non-middleware use like WebSocket)
 * Returns the decoded token payload or throws an error
 */
export declare const verifyToken: (token: string) => TokenPayload;
//# sourceMappingURL=authMiddleware.d.ts.map