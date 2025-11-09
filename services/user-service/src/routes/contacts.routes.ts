import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import contactService from '../services/contact.service';
import userService from '../services/user.service';
import { validateToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { ContactPriority, ContactRelationship } from '../models/EmergencyContact';
import logger from '../utils/logger';

const router = Router();

/**
 * Validation Schemas
 */

const createContactSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  phoneNumber: Joi.string().min(10).max(20).required(),
  email: Joi.string().email().max(255).optional(),
  relationship: Joi.string()
    .valid(...Object.values(ContactRelationship))
    .required(),
  priority: Joi.string()
    .valid(...Object.values(ContactPriority))
    .default(ContactPriority.PRIMARY),
  address: Joi.string().max(500).optional(),
  notes: Joi.string().max(1000).optional(),
});

const updateContactSchema = Joi.object({
  name: Joi.string().min(1).max(200).optional(),
  phoneNumber: Joi.string().min(10).max(20).optional(),
  email: Joi.string().email().max(255).optional().allow(null),
  relationship: Joi.string()
    .valid(...Object.values(ContactRelationship))
    .optional(),
  priority: Joi.string()
    .valid(...Object.values(ContactPriority))
    .optional(),
  address: Joi.string().max(500).optional().allow(null),
  notes: Joi.string().max(1000).optional().allow(null),
});

/**
 * @route   GET /api/v1/contacts
 * @desc    Get all emergency contacts for current user
 * @access  Private
 */
router.get('/', validateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // Parse query parameters
    const priority = req.query.priority as ContactPriority | undefined;
    const includeUnverified = req.query.includeUnverified === 'true';

    // Get contacts
    const contacts = await contactService.getUserContacts(userId, {
      priority,
      includeUnverified,
    });

    // Get contact statistics
    const stats = await contactService.getContactStats(userId);

    res.json({
      success: true,
      data: {
        contacts: contacts.map((c) => c.toSafeObject()),
        stats,
      },
      message: 'Emergency contacts retrieved successfully',
    });
  } catch (error) {
    logger.error('Error in GET /api/v1/contacts:', error);
    next(error);
  }
});

/**
 * @route   GET /api/v1/contacts/:id
 * @desc    Get a specific emergency contact
 * @access  Private
 */
router.get('/:id', validateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const contactId = req.params.id;

    const contact = await contactService.getContactById(userId, contactId);

    res.json({
      success: true,
      data: {
        contact: contact.toSafeObject(),
      },
      message: 'Emergency contact retrieved successfully',
    });
  } catch (error) {
    logger.error('Error in GET /api/v1/contacts/:id:', error);
    next(error);
  }
});

/**
 * @route   POST /api/v1/contacts
 * @desc    Create a new emergency contact
 * @access  Private
 */
router.post('/', validateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // Validate request body
    const { error, value } = createContactSchema.validate(req.body);

    if (error) {
      throw new AppError(
        `Validation error: ${error.details.map((d) => d.message).join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }

    // Get or create user profile
    const profile = await userService.getOrCreateUserProfile(userId);

    // Create contact
    const contact = await contactService.createContact(userId, profile.id, value);

    res.status(201).json({
      success: true,
      data: {
        contact: contact.toSafeObject(),
      },
      message: 'Emergency contact created successfully',
    });
  } catch (error) {
    logger.error('Error in POST /api/v1/contacts:', error);
    next(error);
  }
});

/**
 * @route   PUT /api/v1/contacts/:id
 * @desc    Update an emergency contact
 * @access  Private
 */
router.put('/:id', validateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const contactId = req.params.id;

    // Validate request body
    const { error, value } = updateContactSchema.validate(req.body);

    if (error) {
      throw new AppError(
        `Validation error: ${error.details.map((d) => d.message).join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }

    // Update contact
    const contact = await contactService.updateContact(userId, contactId, value);

    res.json({
      success: true,
      data: {
        contact: contact.toSafeObject(),
      },
      message: 'Emergency contact updated successfully',
    });
  } catch (error) {
    logger.error('Error in PUT /api/v1/contacts/:id:', error);
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/contacts/:id
 * @desc    Delete an emergency contact
 * @access  Private
 */
router.delete('/:id', validateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const contactId = req.params.id;

    await contactService.deleteContact(userId, contactId);

    res.json({
      success: true,
      data: null,
      message: 'Emergency contact deleted successfully',
    });
  } catch (error) {
    logger.error('Error in DELETE /api/v1/contacts/:id:', error);
    next(error);
  }
});

/**
 * @route   POST /api/v1/contacts/:id/verify
 * @desc    Mark a contact as verified
 * @access  Private
 */
router.post(
  '/:id/verify',
  validateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const contactId = req.params.id;

      const contact = await contactService.verifyContact(userId, contactId);

      res.json({
        success: true,
        data: {
          contact: contact.toSafeObject(),
        },
        message: 'Emergency contact verified successfully',
      });
    } catch (error) {
      logger.error('Error in POST /api/v1/contacts/:id/verify:', error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/contacts/priority/:priority
 * @desc    Get contacts by priority level
 * @access  Private
 */
router.get(
  '/priority/:priority',
  validateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const priority = req.params.priority as ContactPriority;

      // Validate priority
      if (!Object.values(ContactPriority).includes(priority)) {
        throw new AppError('Invalid priority level', 400, 'INVALID_PRIORITY');
      }

      const contacts = await contactService.getContactsByPriority(userId, priority);

      res.json({
        success: true,
        data: {
          contacts: contacts.map((c) => c.toSafeObject()),
          priority,
          count: contacts.length,
        },
        message: `${priority} contacts retrieved successfully`,
      });
    } catch (error) {
      logger.error('Error in GET /api/v1/contacts/priority/:priority:', error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/contacts/stats
 * @desc    Get contact statistics
 * @access  Private
 */
router.get('/stats', validateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const stats = await contactService.getContactStats(userId);

    res.json({
      success: true,
      data: stats,
      message: 'Contact statistics retrieved successfully',
    });
  } catch (error) {
    logger.error('Error in GET /api/v1/contacts/stats:', error);
    next(error);
  }
});

export default router;
