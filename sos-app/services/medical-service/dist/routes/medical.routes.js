"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const joi_1 = __importDefault(require("joi"));
const medical_service_1 = __importDefault(require("../services/medical.service"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const MedicalAccessAudit_1 = require("../models/MedicalAccessAudit");
const MedicalProfile_1 = require("../models/MedicalProfile");
const MedicalAllergy_1 = require("../models/MedicalAllergy");
const MedicalCondition_1 = require("../models/MedicalCondition");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
/**
 * Validation Schemas
 */
const updateProfileSchema = joi_1.default.object({
    bloodType: joi_1.default.string()
        .valid(...Object.values(MedicalProfile_1.BloodType))
        .optional(),
    organDonor: joi_1.default.boolean().optional(),
    doNotResuscitate: joi_1.default.boolean().optional(),
    emergencyNotes: joi_1.default.string().max(5000).allow('').optional(),
    primaryPhysician: joi_1.default.string().max(200).allow('').optional(),
    primaryPhysicianPhone: joi_1.default.string().max(20).allow('').optional(),
    insuranceProvider: joi_1.default.string().max(200).allow('').optional(),
    insurancePolicyNumber: joi_1.default.string().max(100).allow('').optional(),
});
const createAllergySchema = joi_1.default.object({
    allergen: joi_1.default.string().min(1).max(200).required(),
    severity: joi_1.default.string()
        .valid(...Object.values(MedicalAllergy_1.AllergySeverity))
        .required(),
    reaction: joi_1.default.string().max(500).optional(),
    diagnosedDate: joi_1.default.date().iso().max('now').optional(),
    notes: joi_1.default.string().max(1000).optional(),
});
const createMedicationSchema = joi_1.default.object({
    medicationName: joi_1.default.string().min(1).max(200).required(),
    dosage: joi_1.default.string().max(100).optional(),
    frequency: joi_1.default.string().max(200).optional(),
    route: joi_1.default.string().max(50).optional(),
    prescribedBy: joi_1.default.string().max(200).optional(),
    startDate: joi_1.default.date().iso().max('now').optional(),
    endDate: joi_1.default.date().iso().optional(),
    notes: joi_1.default.string().max(1000).optional(),
});
const createConditionSchema = joi_1.default.object({
    conditionName: joi_1.default.string().min(1).max(200).required(),
    severity: joi_1.default.string()
        .valid(...Object.values(MedicalCondition_1.ConditionSeverity))
        .optional(),
    diagnosedDate: joi_1.default.date().iso().max('now').optional(),
    isChronic: joi_1.default.boolean().optional(),
    notes: joi_1.default.string().max(1000).optional(),
});
/**
 * @route   GET /api/v1/medical/profile
 * @desc    Get current user's medical profile
 * @access  Private (User only)
 */
router.get('/profile', auth_1.validateToken, (0, auth_1.logMedicalAccess)('view_profile'), async (req, res, next) => {
    try {
        const userId = req.userId;
        const profile = await medical_service_1.default.getOrCreateProfile(userId, {
            accessedBy: userId,
            role: MedicalAccessAudit_1.AccessRole.USER,
            reason: MedicalAccessAudit_1.AccessReason.USER_REQUEST,
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
    }
    catch (error) {
        logger_1.default.error('Error in GET /api/v1/medical/profile:', error);
        next(error);
    }
});
/**
 * @route   PUT /api/v1/medical/profile
 * @desc    Update current user's medical profile
 * @access  Private (User only)
 */
router.put('/profile', auth_1.validateToken, (0, auth_1.logMedicalAccess)('update_profile'), async (req, res, next) => {
    try {
        const userId = req.userId;
        // Validate request body
        const { error, value } = updateProfileSchema.validate(req.body);
        if (error) {
            throw new errorHandler_1.AppError(`Validation error: ${error.details.map((d) => d.message).join(', ')}`, 400, 'VALIDATION_ERROR');
        }
        const profile = await medical_service_1.default.updateProfile(userId, value, {
            accessedBy: userId,
            role: MedicalAccessAudit_1.AccessRole.USER,
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
    }
    catch (error) {
        logger_1.default.error('Error in PUT /api/v1/medical/profile:', error);
        next(error);
    }
});
/**
 * @route   GET /api/v1/medical/emergency/:userId
 * @desc    Get medical profile for emergency (authorized emergency contacts/responders only)
 * @access  Private (Emergency access during active emergency)
 */
router.get('/emergency/:userId', auth_1.validateToken, (0, auth_1.logMedicalAccess)('view_emergency_profile'), async (req, res, next) => {
    try {
        const userId = req.params.userId;
        const emergencyId = req.query.emergencyId;
        if (!emergencyId) {
            throw new errorHandler_1.AppError('Emergency ID is required', 400, 'EMERGENCY_ID_REQUIRED');
        }
        // Note: In production, verify that requester is authorized for this emergency
        // This would involve checking against the Emergency Service
        const profile = await medical_service_1.default.getProfileForEmergency(userId, emergencyId, {
            accessedBy: req.userId,
            role: MedicalAccessAudit_1.AccessRole.EMERGENCY_CONTACT,
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
    }
    catch (error) {
        logger_1.default.error('Error in GET /api/v1/medical/emergency/:userId:', error);
        next(error);
    }
});
/**
 * @route   POST /api/v1/medical/access-link
 * @desc    Generate secure access link for first responders
 * @access  Private (During active emergency)
 */
router.post('/access-link', auth_1.validateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { emergencyId } = req.body;
        if (!emergencyId) {
            throw new errorHandler_1.AppError('Emergency ID is required', 400, 'EMERGENCY_ID_REQUIRED');
        }
        const { token, expiresAt } = await medical_service_1.default.generateSecureAccessLink(userId, emergencyId, MedicalAccessAudit_1.AccessRole.FIRST_RESPONDER);
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
    }
    catch (error) {
        logger_1.default.error('Error in POST /api/v1/medical/access-link:', error);
        next(error);
    }
});
/**
 * @route   GET /api/v1/medical/secure/:token
 * @desc    Access medical profile via secure link (for first responders)
 * @access  Public (with valid emergency access token)
 */
router.get('/secure/:token', auth_1.validateEmergencyToken, (0, auth_1.logMedicalAccess)('view_via_secure_link'), async (req, res, next) => {
    try {
        const userId = req.profileId;
        const emergencyId = req.emergencyId;
        const profile = await medical_service_1.default.getProfileForEmergency(userId, emergencyId, {
            accessedBy: req.requesterId || 'first_responder',
            role: MedicalAccessAudit_1.AccessRole.FIRST_RESPONDER,
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
    }
    catch (error) {
        logger_1.default.error('Error in GET /api/v1/medical/secure/:token:', error);
        next(error);
    }
});
/**
 * @route   POST /api/v1/medical/allergies
 * @desc    Add allergy to medical profile
 * @access  Private (User only)
 */
router.post('/allergies', auth_1.validateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        // Validate request body
        const { error, value } = createAllergySchema.validate(req.body);
        if (error) {
            throw new errorHandler_1.AppError(`Validation error: ${error.details.map((d) => d.message).join(', ')}`, 400, 'VALIDATION_ERROR');
        }
        const allergy = await medical_service_1.default.addAllergy(userId, value);
        res.status(201).json({
            success: true,
            data: {
                allergy: allergy.toSafeObject(),
            },
            message: 'Allergy added successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Error in POST /api/v1/medical/allergies:', error);
        next(error);
    }
});
/**
 * @route   POST /api/v1/medical/medications
 * @desc    Add medication to medical profile
 * @access  Private (User only)
 */
router.post('/medications', auth_1.validateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        // Validate request body
        const { error, value } = createMedicationSchema.validate(req.body);
        if (error) {
            throw new errorHandler_1.AppError(`Validation error: ${error.details.map((d) => d.message).join(', ')}`, 400, 'VALIDATION_ERROR');
        }
        const medication = await medical_service_1.default.addMedication(userId, value);
        res.status(201).json({
            success: true,
            data: {
                medication: medication.toSafeObject(),
            },
            message: 'Medication added successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Error in POST /api/v1/medical/medications:', error);
        next(error);
    }
});
/**
 * @route   POST /api/v1/medical/conditions
 * @desc    Add medical condition to profile
 * @access  Private (User only)
 */
router.post('/conditions', auth_1.validateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        // Validate request body
        const { error, value } = createConditionSchema.validate(req.body);
        if (error) {
            throw new errorHandler_1.AppError(`Validation error: ${error.details.map((d) => d.message).join(', ')}`, 400, 'VALIDATION_ERROR');
        }
        const condition = await medical_service_1.default.addCondition(userId, value);
        res.status(201).json({
            success: true,
            data: {
                condition: condition.toSafeObject(),
            },
            message: 'Medical condition added successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Error in POST /api/v1/medical/conditions:', error);
        next(error);
    }
});
/**
 * @route   GET /api/v1/medical/audit
 * @desc    Get audit log for user's medical profile access
 * @access  Private (User only)
 */
router.get('/audit', auth_1.validateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const startDate = req.query.startDate
            ? new Date(req.query.startDate)
            : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
        const { logs, total } = await medical_service_1.default.getAuditLog(userId, {
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
    }
    catch (error) {
        logger_1.default.error('Error in GET /api/v1/medical/audit:', error);
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=medical.routes.js.map