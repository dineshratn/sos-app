import { Request, Response, NextFunction } from 'express';
export interface JWTPayload {
    userId: string;
    email: string;
    role?: string;
}
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            userEmail?: string;
            userRole?: string;
        }
    }
}
/**
 * Middleware to validate JWT token from Authorization header
 */
export declare const validateToken: (req: Request, _res: Response, next: NextFunction) => Promise<void>;
/**
 * Optional authentication - doesn't fail if no token provided
 */
export declare const optionalAuth: (req: Request, _res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map