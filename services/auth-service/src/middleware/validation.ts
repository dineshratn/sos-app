import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';

/**
 * Validation error handler middleware
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array().map((err) => ({
        field: err.type === 'field' ? err.path : undefined,
        message: err.msg,
      })),
    });
    return;
  }

  next();
};

/**
 * Registration validation rules
 */
export const registerValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail()
    .toLowerCase(),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
    .withMessage('Password must contain at least one special character'),

  body('phoneNumber')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number format. Use E.164 format (e.g., +1234567890)'),

  body('firstName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters')
    .trim(),

  body('lastName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters')
    .trim(),

  body('deviceId')
    .notEmpty()
    .withMessage('Device ID is required')
    .isLength({ max: 255 })
    .withMessage('Device ID too long'),

  body('deviceName')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Device name too long')
    .trim(),

  body('deviceType')
    .optional()
    .isIn(['ios', 'android', 'web', 'desktop', 'other'])
    .withMessage('Invalid device type'),
];

/**
 * Login validation rules
 */
export const loginValidation: ValidationChain[] = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail()
    .toLowerCase(),

  body('phoneNumber')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number format'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 1 })
    .withMessage('Password cannot be empty'),

  body('deviceId')
    .notEmpty()
    .withMessage('Device ID is required')
    .isLength({ max: 255 })
    .withMessage('Device ID too long'),

  body('deviceName')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Device name too long')
    .trim(),

  body('deviceType')
    .optional()
    .isIn(['ios', 'android', 'web', 'desktop', 'other'])
    .withMessage('Invalid device type'),

  // Custom validation to ensure either email or phoneNumber is provided
  body().custom((_value, { req }) => {
    if (!req.body.email && !req.body.phoneNumber) {
      throw new Error('Either email or phone number must be provided');
    }
    return true;
  }),
];

/**
 * Token refresh validation rules
 */
export const refreshTokenValidation: ValidationChain[] = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isString()
    .withMessage('Refresh token must be a string'),

  body('deviceId')
    .notEmpty()
    .withMessage('Device ID is required')
    .isLength({ max: 255 })
    .withMessage('Device ID too long'),
];

/**
 * Logout validation rules
 */
export const logoutValidation: ValidationChain[] = [
  body('refreshToken')
    .optional()
    .isString()
    .withMessage('Refresh token must be a string'),

  body('deviceId')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Device ID too long'),

  body('allDevices')
    .optional()
    .isBoolean()
    .withMessage('allDevices must be a boolean'),

  // Custom validation to ensure at least one logout method is provided
  body().custom((_value, { req }) => {
    if (!req.body.refreshToken && !req.body.deviceId && !req.body.allDevices) {
      throw new Error('Must provide refreshToken, deviceId, or allDevices flag');
    }
    return true;
  }),
];
