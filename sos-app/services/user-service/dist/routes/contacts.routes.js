"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const joi_1 = __importDefault(require("joi"));
const contact_service_1 = __importDefault(require("../services/contact.service"));
const user_service_1 = __importDefault(require("../services/user.service"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const EmergencyContact_1 = require("../models/EmergencyContact");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
/**
 * Validation Schemas
 */
const createContactSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(200).required(),
    phoneNumber: joi_1.default.string().min(10).max(20).required(),
    email: joi_1.default.string().email().max(255).optional(),
    relationship: joi_1.default.string()
        .valid(...Object.values(EmergencyContact_1.ContactRelationship))
        .required(),
    priority: joi_1.default.number()
        .valid(...Object.values(EmergencyContact_1.ContactPriority))
        .default(EmergencyContact_1.ContactPriority.CRITICAL),
    address: joi_1.default.string().max(500).optional(),
    notes: joi_1.default.string().max(1000).optional(),
});
const updateContactSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(200).optional(),
    phoneNumber: joi_1.default.string().min(10).max(20).optional(),
    email: joi_1.default.string().email().max(255).optional().allow(null),
    relationship: joi_1.default.string()
        .valid(...Object.values(EmergencyContact_1.ContactRelationship))
        .optional(),
    priority: joi_1.default.number()
        .valid(...Object.values(EmergencyContact_1.ContactPriority))
        .optional(),
    address: joi_1.default.string().max(500).optional().allow(null),
    notes: joi_1.default.string().max(1000).optional().allow(null),
});
/**
 * @route   GET /api/v1/contacts
 * @desc    Get all emergency contacts for current user
 * @access  Private
 */
router.get('/', auth_1.validateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        // Parse query parameters
        const priority = req.query.priority;
        const includeUnverified = req.query.includeUnverified === 'true';
        // Get contacts
        const contacts = await contact_service_1.default.getUserContacts(userId, {
            priority,
            includeUnverified,
        });
        // Get contact statistics
        const stats = await contact_service_1.default.getContactStats(userId);
        res.json({
            success: true,
            data: {
                contacts: contacts.map((c) => c.toSafeObject()),
                stats,
            },
            message: 'Emergency contacts retrieved successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Error in GET /api/v1/contacts:', error);
        next(error);
    }
});
/**
 * @route   GET /api/v1/contacts/:id
 * @desc    Get a specific emergency contact
 * @access  Private
 */
router.get('/:id', auth_1.validateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        const contactId = req.params.id;
        const contact = await contact_service_1.default.getContactById(userId, contactId);
        res.json({
            success: true,
            data: {
                contact: contact.toSafeObject(),
            },
            message: 'Emergency contact retrieved successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Error in GET /api/v1/contacts/:id:', error);
        next(error);
    }
});
/**
 * @route   POST /api/v1/contacts
 * @desc    Create a new emergency contact
 * @access  Private
 */
router.post('/', auth_1.validateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        // Validate request body
        const { error, value } = createContactSchema.validate(req.body);
        if (error) {
            throw new errorHandler_1.AppError(`Validation error: ${error.details.map((d) => d.message).join(', ')}`, 400, 'VALIDATION_ERROR');
        }
        // Get or create user profile
        const profile = await user_service_1.default.getOrCreateUserProfile(userId);
        // Create contact
        const contact = await contact_service_1.default.createContact(userId, profile.id, value);
        res.status(201).json({
            success: true,
            data: {
                contact: contact.toSafeObject(),
            },
            message: 'Emergency contact created successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Error in POST /api/v1/contacts:', error);
        next(error);
    }
});
/**
 * @route   PUT /api/v1/contacts/:id
 * @desc    Update an emergency contact
 * @access  Private
 */
router.put('/:id', auth_1.validateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        const contactId = req.params.id;
        // Validate request body
        const { error, value } = updateContactSchema.validate(req.body);
        if (error) {
            throw new errorHandler_1.AppError(`Validation error: ${error.details.map((d) => d.message).join(', ')}`, 400, 'VALIDATION_ERROR');
        }
        // Update contact
        const contact = await contact_service_1.default.updateContact(userId, contactId, value);
        res.json({
            success: true,
            data: {
                contact: contact.toSafeObject(),
            },
            message: 'Emergency contact updated successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Error in PUT /api/v1/contacts/:id:', error);
        next(error);
    }
});
/**
 * @route   DELETE /api/v1/contacts/:id
 * @desc    Delete an emergency contact
 * @access  Private
 */
router.delete('/:id', auth_1.validateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        const contactId = req.params.id;
        await contact_service_1.default.deleteContact(userId, contactId);
        res.json({
            success: true,
            data: null,
            message: 'Emergency contact deleted successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Error in DELETE /api/v1/contacts/:id:', error);
        next(error);
    }
});
/**
 * @route   POST /api/v1/contacts/:id/verify
 * @desc    Mark a contact as verified
 * @access  Private
 */
router.post('/:id/verify', auth_1.validateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        const contactId = req.params.id;
        const contact = await contact_service_1.default.verifyContact(userId, contactId);
        res.json({
            success: true,
            data: {
                contact: contact.toSafeObject(),
            },
            message: 'Emergency contact verified successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Error in POST /api/v1/contacts/:id/verify:', error);
        next(error);
    }
});
/**
 * @route   GET /api/v1/contacts/priority/:priority
 * @desc    Get contacts by priority level
 * @access  Private
 */
router.get('/priority/:priority', auth_1.validateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        const priority = parseInt(req.params.priority, 10);
        // Validate priority
        if (!Object.values(EmergencyContact_1.ContactPriority).includes(priority)) {
            throw new errorHandler_1.AppError('Invalid priority level', 400, 'INVALID_PRIORITY');
        }
        const contacts = await contact_service_1.default.getContactsByPriority(userId, priority);
        res.json({
            success: true,
            data: {
                contacts: contacts.map((c) => c.toSafeObject()),
                priority,
                count: contacts.length,
            },
            message: `${priority} contacts retrieved successfully`,
        });
    }
    catch (error) {
        logger_1.default.error('Error in GET /api/v1/contacts/priority/:priority:', error);
        next(error);
    }
});
/**
 * @route   GET /api/v1/contacts/stats
 * @desc    Get contact statistics
 * @access  Private
 */
router.get('/stats', auth_1.validateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        const stats = await contact_service_1.default.getContactStats(userId);
        res.json({
            success: true,
            data: stats,
            message: 'Contact statistics retrieved successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Error in GET /api/v1/contacts/stats:', error);
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=contacts.routes.js.map