import { Router, Request, Response } from 'express';
import emergencyContactService from '../services/emergencyContact.service';
import { asyncHandler } from '../middleware/errorHandler';
import { validateToken } from '../middleware/authMiddleware';
import logger from '../utils/logger';

const router = Router();

/**
 * Emergency Contact Routes
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(validateToken);

/**
 * @route   GET /api/v1/users/emergency-contacts
 * @desc    Get all emergency contacts
 * @access  Private
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    logger.info(`Getting emergency contacts for user: ${userId}`);

    const contacts = await emergencyContactService.getContacts(userId);

    res.status(200).json({
      success: true,
      count: contacts.length,
      contacts: contacts.map((c) => c.toSafeObject()),
    });
  })
);

/**
 * @route   POST /api/v1/users/emergency-contacts
 * @desc    Create new emergency contact
 * @access  Private
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    logger.info(`Creating emergency contact for user: ${userId}`);

    const contact = await emergencyContactService.createContact(userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Emergency contact created successfully',
      contact: contact.toSafeObject(),
    });
  })
);

/**
 * @route   GET /api/v1/users/emergency-contacts/:contactId
 * @desc    Get specific emergency contact
 * @access  Private
 */
router.get(
  '/:contactId',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { contactId } = req.params;

    logger.info(`Getting emergency contact ${contactId} for user: ${userId}`);

    const contact = await emergencyContactService.getContactById(contactId, userId);

    res.status(200).json({
      success: true,
      contact: contact.toSafeObject(),
    });
  })
);

/**
 * @route   PUT /api/v1/users/emergency-contacts/:contactId
 * @desc    Update emergency contact
 * @access  Private
 */
router.put(
  '/:contactId',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { contactId } = req.params;

    logger.info(`Updating emergency contact ${contactId} for user: ${userId}`);

    const contact = await emergencyContactService.updateContact(
      contactId,
      userId,
      req.body
    );

    res.status(200).json({
      success: true,
      message: 'Emergency contact updated successfully',
      contact: contact.toSafeObject(),
    });
  })
);

/**
 * @route   DELETE /api/v1/users/emergency-contacts/:contactId
 * @desc    Delete emergency contact
 * @access  Private
 */
router.delete(
  '/:contactId',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { contactId } = req.params;

    logger.info(`Deleting emergency contact ${contactId} for user: ${userId}`);

    await emergencyContactService.deleteContact(contactId, userId);

    res.status(200).json({
      success: true,
      message: 'Emergency contact deleted successfully',
    });
  })
);

/**
 * @route   PUT /api/v1/users/emergency-contacts/:contactId/primary
 * @desc    Set contact as primary
 * @access  Private
 */
router.put(
  '/:contactId/primary',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { contactId } = req.params;

    logger.info(`Setting emergency contact ${contactId} as primary for user: ${userId}`);

    const contact = await emergencyContactService.setPrimaryContact(contactId, userId);

    res.status(200).json({
      success: true,
      message: 'Primary contact updated successfully',
      contact: contact.toSafeObject(),
    });
  })
);

export default router;
