import { Request, Response, NextFunction } from 'express';
export interface JWTPayload {
    userId: string;
    email: string;
    iat: number;
    exp: number;
}
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            userEmail?: string;
        }
    }
}
/**
 * Validate JWT token from Authorization header
 */
export declare const validateToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Validate emergency access token
 * Used for first responders and emergency contacts
 */
export declare const validateEmergencyToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Log medical data access for HIPAA compliance
 */
export declare const logMedicalAccess: (action: string) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map