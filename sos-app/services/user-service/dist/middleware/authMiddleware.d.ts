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
export declare const validateToken: (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=authMiddleware.d.ts.map