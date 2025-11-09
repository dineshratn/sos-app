/**
 * HTTP Authentication Middleware
 * JWT token validation for REST API endpoints
 */
import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    userId?: string;
    userName?: string;
    userRole?: string;
}
/**
 * Middleware to authenticate HTTP requests
 */
export declare const authenticateHTTP: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Optional authentication - adds user info if token is present but doesn't fail if missing
 */
export declare const optionalAuthentication: (req: AuthenticatedRequest, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.http.middleware.d.ts.map