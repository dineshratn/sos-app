/**
 * LLM Service Routes
 *
 * Proxy routes to LLM Service for AI-powered emergency assessment and first aid guidance
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import httpClient from '../utils/httpClient';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/llm/assess
 * AI-powered emergency severity assessment
 */
router.post(
  '/assess',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      logger.info(`LLM assessment request from user: ${userId}`);

      const response = await httpClient.post(
        'llm',
        '/api/v1/llm/assess',
        req.body,
        {
          headers: {
            'X-User-Id': userId,
            'X-Request-Id': req.headers['x-request-id'] as string,
          },
        }
      );

      res.status(response.status).json(response.data);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/llm/first-aid
 * AI-powered first aid guidance
 */
router.post(
  '/first-aid',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      logger.info(`LLM first aid request from user: ${userId}`);

      const response = await httpClient.post(
        'llm',
        '/api/v1/llm/first-aid',
        req.body,
        {
          headers: {
            'X-User-Id': userId,
            'X-Request-Id': req.headers['x-request-id'] as string,
          },
        }
      );

      res.status(response.status).json(response.data);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/llm/health
 * Check LLM service health
 */
router.get(
  '/health',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const response = await httpClient.get('llm', '/health');
      res.status(response.status).json(response.data);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
