import { Router, Request, Response } from 'express';
import profileService from '../services/profile.service';
import { asyncHandler } from '../middleware/errorHandler';
import { validateToken } from '../middleware/authMiddleware';
import logger from '../utils/logger';

const router = Router();

/**
 * User Profile Routes
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(validateToken);

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    logger.info(`Getting profile for user: ${userId}`);

    const profile = await profileService.getProfile(userId);

    res.status(200).json({
      success: true,
      profile: profile.toSafeObject(),
    });
  })
);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    logger.info(`Updating profile for user: ${userId}`);

    const profile = await profileService.updateProfile(userId, req.body);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile: profile.toSafeObject(),
    });
  })
);

/**
 * @route   DELETE /api/v1/users/profile
 * @desc    Delete user account (soft delete)
 * @access  Private
 */
router.delete(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    logger.info(`Deleting profile for user: ${userId}`);

    await profileService.deleteProfile(userId);

    res.status(200).json({
      success: true,
      message: 'Profile deleted successfully',
    });
  })
);

export default router;
