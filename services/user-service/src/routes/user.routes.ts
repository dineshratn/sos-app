import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import userService from '../services/user.service';
import { validateToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

const router = Router();

/**
 * Validation Schemas
 */

const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(1).max(100).optional(),
  lastName: Joi.string().min(1).max(100).optional(),
  dateOfBirth: Joi.date().iso().max('now').optional(),
  profilePictureUrl: Joi.string().uri().max(500).optional(),
  phoneNumber: Joi.string().min(10).max(20).optional(),
  address: Joi.string().max(500).optional(),
  city: Joi.string().max(100).optional(),
  state: Joi.string().max(100).optional(),
  country: Joi.string().max(100).optional(),
  postalCode: Joi.string().max(20).optional(),
  timezone: Joi.string().max(50).optional(),
  language: Joi.string().length(2).optional(),
  notificationPreferences: Joi.object().optional(),
});

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/me', validateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // Get or create profile if it doesn't exist
    const profile = await userService.getOrCreateUserProfile(userId);

    res.json({
      success: true,
      data: {
        profile: profile.toSafeObject(),
      },
      message: 'User profile retrieved successfully',
    });
  } catch (error) {
    logger.error('Error in GET /api/v1/users/me:', error);
    next(error);
  }
});

/**
 * @route   PUT /api/v1/users/me
 * @desc    Update current user's profile
 * @access  Private
 */
router.put('/me', validateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // Validate request body
    const { error, value } = updateProfileSchema.validate(req.body);

    if (error) {
      throw new AppError(
        `Validation error: ${error.details.map((d) => d.message).join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }

    // Update profile
    const profile = await userService.updateUserProfile(userId, value);

    res.json({
      success: true,
      data: {
        profile: profile.toSafeObject(),
      },
      message: 'User profile updated successfully',
    });
  } catch (error) {
    logger.error('Error in PUT /api/v1/users/me:', error);
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/users/me
 * @desc    Delete current user's account (soft delete)
 * @access  Private
 */
router.delete('/me', validateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // Soft delete the user profile
    await userService.deleteUserProfile(userId);

    res.json({
      success: true,
      data: null,
      message: 'User account deleted successfully',
    });
  } catch (error) {
    logger.error('Error in DELETE /api/v1/users/me:', error);
    next(error);
  }
});

/**
 * @route   GET /api/v1/users/me/age
 * @desc    Get current user's age
 * @access  Private
 */
router.get('/me/age', validateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const age = await userService.getUserAge(userId);

    res.json({
      success: true,
      data: {
        age,
      },
      message: age !== null ? 'Age calculated successfully' : 'Date of birth not set',
    });
  } catch (error) {
    logger.error('Error in GET /api/v1/users/me/age:', error);
    next(error);
  }
});

/**
 * @route   PUT /api/v1/users/me/picture
 * @desc    Update profile picture URL
 * @access  Private
 */
router.put(
  '/me/picture',
  validateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const { pictureUrl } = req.body;

      if (!pictureUrl) {
        throw new AppError('Picture URL is required', 400, 'PICTURE_URL_REQUIRED');
      }

      // Validate URL format
      const urlSchema = Joi.string().uri().max(500);
      const { error } = urlSchema.validate(pictureUrl);

      if (error) {
        throw new AppError('Invalid picture URL format', 400, 'INVALID_URL');
      }

      const profile = await userService.updateProfilePicture(userId, pictureUrl);

      res.json({
        success: true,
        data: {
          profilePictureUrl: profile.profilePictureUrl,
        },
        message: 'Profile picture updated successfully',
      });
    } catch (error) {
      logger.error('Error in PUT /api/v1/users/me/picture:', error);
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/users/me/notifications
 * @desc    Update notification preferences
 * @access  Private
 */
router.put(
  '/me/notifications',
  validateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const preferences = req.body;

      if (!preferences || typeof preferences !== 'object') {
        throw new AppError(
          'Notification preferences must be an object',
          400,
          'INVALID_PREFERENCES'
        );
      }

      const profile = await userService.updateNotificationPreferences(userId, preferences);

      res.json({
        success: true,
        data: {
          notificationPreferences: profile.notificationPreferences,
        },
        message: 'Notification preferences updated successfully',
      });
    } catch (error) {
      logger.error('Error in PUT /api/v1/users/me/notifications:', error);
      next(error);
    }
  }
);

export default router;
