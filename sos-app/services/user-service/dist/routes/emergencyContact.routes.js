"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const emergencyContact_service_1 = __importDefault(require("../services/emergencyContact.service"));
const errorHandler_1 = require("../middleware/errorHandler");
const authMiddleware_1 = require("../middleware/authMiddleware");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
/**
 * Emergency Contact Routes
 * All routes require authentication
 */
// Apply authentication to all routes
router.use(authMiddleware_1.validateToken);
/**
 * @route   GET /api/v1/users/emergency-contacts
 * @desc    Get all emergency contacts
 * @access  Private
 */
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    logger_1.default.info(`Getting emergency contacts for user: ${userId}`);
    const contacts = await emergencyContact_service_1.default.getContacts(userId);
    res.status(200).json({
        success: true,
        count: contacts.length,
        contacts: contacts.map((c) => c.toSafeObject()),
    });
}));
/**
 * @route   POST /api/v1/users/emergency-contacts
 * @desc    Create new emergency contact
 * @access  Private
 */
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    logger_1.default.info(`Creating emergency contact for user: ${userId}`);
    const contact = await emergencyContact_service_1.default.createContact(userId, req.body);
    res.status(201).json({
        success: true,
        message: 'Emergency contact created successfully',
        contact: contact.toSafeObject(),
    });
}));
/**
 * @route   GET /api/v1/users/emergency-contacts/:contactId
 * @desc    Get specific emergency contact
 * @access  Private
 */
router.get('/:contactId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const { contactId } = req.params;
    logger_1.default.info(`Getting emergency contact ${contactId} for user: ${userId}`);
    const contact = await emergencyContact_service_1.default.getContactById(contactId, userId);
    res.status(200).json({
        success: true,
        contact: contact.toSafeObject(),
    });
}));
/**
 * @route   PUT /api/v1/users/emergency-contacts/:contactId
 * @desc    Update emergency contact
 * @access  Private
 */
router.put('/:contactId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const { contactId } = req.params;
    logger_1.default.info(`Updating emergency contact ${contactId} for user: ${userId}`);
    const contact = await emergencyContact_service_1.default.updateContact(contactId, userId, req.body);
    res.status(200).json({
        success: true,
        message: 'Emergency contact updated successfully',
        contact: contact.toSafeObject(),
    });
}));
/**
 * @route   DELETE /api/v1/users/emergency-contacts/:contactId
 * @desc    Delete emergency contact
 * @access  Private
 */
router.delete('/:contactId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const { contactId } = req.params;
    logger_1.default.info(`Deleting emergency contact ${contactId} for user: ${userId}`);
    await emergencyContact_service_1.default.deleteContact(contactId, userId);
    res.status(200).json({
        success: true,
        message: 'Emergency contact deleted successfully',
    });
}));
/**
 * @route   PUT /api/v1/users/emergency-contacts/:contactId/primary
 * @desc    Set contact as primary
 * @access  Private
 */
router.put('/:contactId/primary', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const { contactId } = req.params;
    logger_1.default.info(`Setting emergency contact ${contactId} as primary for user: ${userId}`);
    const contact = await emergencyContact_service_1.default.setPrimaryContact(contactId, userId);
    res.status(200).json({
        success: true,
        message: 'Primary contact updated successfully',
        contact: contact.toSafeObject(),
    });
}));
exports.default = router;
//# sourceMappingURL=emergencyContact.routes.js.map