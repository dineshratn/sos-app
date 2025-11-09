import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import medicalService from '../services/medical.service';
import { validateToken, validateEmergencyToken, logMedicalAccess } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AccessRole, AccessReason } from '../models/MedicalAccessAudit';
import { BloodType } from '../models/MedicalProfile';
import { AllergySeverity } from '../models/MedicalAllergy';
import { ConditionSeverity } from '../models/MedicalCondition';
import logger from '../utils/logger';

const router = Router();

/**
 * Validation Schemas
 */

const updateProfileSchema = Joi.object({
  bloodType: Joi.string()
    .valid(...Object.values(BloodType))
    .optional(),
  organDonor: Joi.boolean().optional(),
  doNotResuscitate: Joi.boolean().optional(),
  emergencyNotes: Joi.string().max(5000).allow('').optional(),
  primaryPhysician: Joi.string().max(200).allow('').optional(),
  primaryPhysicianPhone: Joi.string().max(20).allow('').optional(),
  insuranceProvider: Joi.string().max(200).allow('').optional(),
  insurancePolicyNumber: Joi.string().max(100).allow('').optional(),
});

const createAllergySchema = Joi.object({
  allergen: Joi.string().min(1).max(200).required(),
  severity: Joi.string()
    .valid(...Object.values(AllergySeverity))
    .required(),
  reaction: Joi.string().max(500).optional(),
  diagnosedDate: Joi.date().iso().max('now').optional(),
  notes: Joi.string().max(1000).optional(),
});

const createMedicationSchema = Joi.object({
  medicationName: Joi.string().min(1).max(200).required(),
  dosage: Joi.string().max(100).optional(),
  frequency: Joi.string().max(200).optional(),
  route: Joi.string().max(50).optional(),
  prescribedBy: Joi.string().max(200).optional(),
  startDate: Joi.date().iso().max('now').optional(),
  endDate: Joi.date().iso().optional(),
  notes: Joi.string().max(1000).optional(),
});

const createConditionSchema = Joi.object({
  conditionName: Joi.string().min(1).max(200).required(),
  severity: Joi.string()
    .valid(...Object.values(ConditionSeverity))
    .optional(),
  diagnosedDate: Joi.date().iso().max('now').optional(),
  isChronic: Joi.boolean().optional(),
  notes: Joi.string().max(1000).optional(),
});

/**
 * @route   GET /api/v1/medical/profile
 * @desc    Get current user's medical profile
 * @access  Private (User only)
 */
router.get(
  '/profile',
  validateToken,
  logMedicalAccess('view_profile'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;

      const profile = await medicalService.getOrCreateProfile(userId, {
        accessedBy: userId,
        role: AccessRole.USER,
        reason: AccessReason.USER_REQUEST,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        data: {
          profile: profile.toSafeObject(),
          needsReview: profile.needsReview(),
        },
        message: 'Medical profile retrieved successfully',
      });
    } catch (error) {
      logger.error('Error in GET /api/v1/medical/profile:', error);
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/medical/profile
 * @desc    Update current user's medical profile
 * @access  Private (User only)
 */
router.put(
  '/profile',
  validateToken,
  logMedicalAccess('update_profile'),
  async (req: Request, res: Response, next: NextFunction) => {
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

      const profile = await medicalService.updateProfile(userId, value, {
        accessedBy: userId,
        role: AccessRole.USER,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        data: {
          profile: profile.toSafeObject(),
        },
        message: 'Medical profile updated successfully',
      });
    } catch (error) {
      logger.error('Error in PUT /api/v1/medical/profile:', error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/medical/emergency/:userId
 * @desc    Get medical profile for emergency (authorized emergency contacts/responders only)
 * @access  Private (Emergency access during active emergency)
 */
router.get(
  '/emergency/:userId',
  validateToken,
  logMedicalAccess('view_emergency_profile'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.userId;
      const emergencyId = req.query.emergencyId as string;

      if (!emergencyId) {
        throw new AppError('Emergency ID is required', 400, 'EMERGENCY_ID_REQUIRED');
      }

      // Note: In production, verify that requester is authorized for this emergency
      // This would involve checking against the Emergency Service

      const profile = await medicalService.getProfileForEmergency(userId, emergencyId, {
        accessedBy: req.userId!,
        role: AccessRole.EMERGENCY_CONTACT,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        data: {
          profile,
          emergencyId,
        },
        message: 'Emergency medical profile retrieved successfully',
      });
    } catch (error) {
      logger.error('Error in GET /api/v1/medical/emergency/:userId:', error);
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/medical/access-link
 * @desc    Generate secure access link for first responders
 * @access  Private (During active emergency)
 */
router.post(
  '/access-link',
  validateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const { emergencyId } = req.body;

      if (!emergencyId) {
        throw new AppError('Emergency ID is required', 400, 'EMERGENCY_ID_REQUIRED');
      }

      const { token, expiresAt } = await medicalService.generateSecureAccessLink(
        userId,
        emergencyId,
        AccessRole.FIRST_RESPONDER
      );

      // Generate full URL
      const baseUrl = process.env.FRONTEND_URL || 'https://sos-app.com';
      const secureLink = `${baseUrl}/medical/secure/${token}`;

      res.json({
        success: true,
        data: {
          accessLink: secureLink,
          token,
          expiresAt,
          validFor: '1 hour',
        },
        message: 'Secure access link generated successfully',
      });
    } catch (error) {
      logger.error('Error in POST /api/v1/medical/access-link:', error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/medical/secure/:token
 * @desc    Access medical profile via secure link (for first responders)
 * @access  Public (with valid emergency access token)
 */
router.get(
  '/secure/:token',
  validateEmergencyToken,
  logMedicalAccess('view_via_secure_link'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).profileId;
      const emergencyId = (req as any).emergencyId;

      const profile = await medicalService.getProfileForEmergency(userId, emergencyId, {
        accessedBy: (req as any).requesterId || 'first_responder',
        role: AccessRole.FIRST_RESPONDER,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        data: {
          profile,
          emergencyId,
          accessMethod: 'secure_link',
        },
        message: 'Emergency medical information retrieved successfully',
      });
    } catch (error) {
      logger.error('Error in GET /api/v1/medical/secure/:token:', error);
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/medical/allergies
 * @desc    Add allergy to medical profile
 * @access  Private (User only)
 */
router.post(
  '/allergies',
  validateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;

      // Validate request body
      const { error, value } = createAllergySchema.validate(req.body);

      if (error) {
        throw new AppError(
          `Validation error: ${error.details.map((d) => d.message).join(', ')}`,
          400,
          'VALIDATION_ERROR'
        );
      }

      const allergy = await medicalService.addAllergy(userId, value);

      res.status(201).json({
        success: true,
        data: {
          allergy: allergy.toSafeObject(),
        },
        message: 'Allergy added successfully',
      });
    } catch (error) {
      logger.error('Error in POST /api/v1/medical/allergies:', error);
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/medical/medications
 * @desc    Add medication to medical profile
 * @access  Private (User only)
 */
router.post(
  '/medications',
  validateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;

      // Validate request body
      const { error, value } = createMedicationSchema.validate(req.body);

      if (error) {
        throw new AppError(
          `Validation error: ${error.details.map((d) => d.message).join(', ')}`,
          400,
          'VALIDATION_ERROR'
        );
      }

      const medication = await medicalService.addMedication(userId, value);

      res.status(201).json({
        success: true,
        data: {
          medication: medication.toSafeObject(),
        },
        message: 'Medication added successfully',
      });
    } catch (error) {
      logger.error('Error in POST /api/v1/medical/medications:', error);
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/medical/conditions
 * @desc    Add medical condition to profile
 * @access  Private (User only)
 */
router.post(
  '/conditions',
  validateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;

      // Validate request body
      const { error, value } = createConditionSchema.validate(req.body);

      if (error) {
        throw new AppError(
          `Validation error: ${error.details.map((d) => d.message).join(', ')}`,
          400,
          'VALIDATION_ERROR'
        );
      }

      const condition = await medicalService.addCondition(userId, value);

      res.status(201).json({
        success: true,
        data: {
          condition: condition.toSafeObject(),
        },
        message: 'Medical condition added successfully',
      });
    } catch (error) {
      logger.error('Error in POST /api/v1/medical/conditions:', error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/medical/audit
 * @desc    Get audit log for user's medical profile access
 * @access  Private (User only)
 */
router.get(
  '/audit',
  validateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const { logs, total } = await medicalService.getAuditLog(userId, {
        limit,
        offset,
        startDate,
        endDate,
      });

      res.json({
        success: true,
        data: {
          logs: logs.map((log) => log.toSafeObject()),
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
          },
        },
        message: 'Audit log retrieved successfully',
      });
    } catch (error) {
      logger.error('Error in GET /api/v1/medical/audit:', error);
      next(error);
    }
  }
);

export default router;
