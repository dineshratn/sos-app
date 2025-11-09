import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    statusCode: number;
    code: string;
    isOperational: boolean;
    constructor(message: string, statusCode?: number, code?: string);
}
/**
 * Global error handler middleware
 */
export declare const errorHandler: (err: Error | AppError, req: Request, res: Response, _next: NextFunction) => void;
/**
 * 404 Not Found handler
 */
export declare const notFoundHandler: (_req: Request, _res: Response, next: NextFunction) => void;
/**
 * Async error wrapper
 * Catches errors in async route handlers
 */
export declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map