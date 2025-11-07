import EmergencyContact, {
  ContactPriority,
  ContactRelationship,
  EmergencyContactCreationAttributes,
} from '../models/EmergencyContact';
import UserProfile from '../models/UserProfile';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import {
  validateContactInfo,
  formatPhoneNumber,
  sanitizeEmail,
} from '../utils/contactValidation';
import { Op } from 'sequelize';

/**
 * Emergency Contact Service
 *
 * Handles all business logic related to emergency contacts including:
 * - Contact creation with validation
 * - Contact retrieval and filtering
 * - Contact updates
 * - Contact deletion
 * - Priority management
 */

export interface CreateEmergencyContactDTO {
  name: string;
  phoneNumber: string;
  email?: string;
  relationship: ContactRelationship;
  priority: ContactPriority;
  address?: string;
  notes?: string;
}

export interface UpdateEmergencyContactDTO {
  name?: string;
  phoneNumber?: string;
  email?: string;
  relationship?: ContactRelationship;
  priority?: ContactPriority;
  address?: string;
  notes?: string;
}

class EmergencyContactService {
  /**
   * Get all emergency contacts for a user
   */
  public async getUserContacts(
    userId: string,
    options?: {
      priority?: ContactPriority;
      includeUnverified?: boolean;
    }
  ): Promise<EmergencyContact[]> {
    try {
      const where: any = { userId };

      // Filter by priority if specified
      if (options?.priority) {
        where.priority = options.priority;
      }

      // Filter by verification status
      if (options?.includeUnverified === false) {
        where.isVerified = true;
      }

      const contacts = await EmergencyContact.findAll({
        where,
        order: [
          ['priority', 'ASC'], // Primary first, then secondary, then tertiary
          ['createdAt', 'DESC'],
        ],
      });

      return contacts;
    } catch (error) {
      logger.error('Error fetching emergency contacts:', error);
      throw new AppError('Failed to fetch emergency contacts', 500, 'FETCH_CONTACTS_ERROR');
    }
  }

  /**
   * Get a single emergency contact by ID
   */
  public async getContactById(userId: string, contactId: string): Promise<EmergencyContact> {
    try {
      const contact = await EmergencyContact.findOne({
        where: {
          id: contactId,
          userId,
        },
      });

      if (!contact) {
        throw new AppError('Emergency contact not found', 404, 'CONTACT_NOT_FOUND');
      }

      return contact;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error fetching emergency contact:', error);
      throw new AppError('Failed to fetch emergency contact', 500, 'FETCH_CONTACT_ERROR');
    }
  }

  /**
   * Create a new emergency contact
   */
  public async createContact(
    userId: string,
    userProfileId: string,
    data: CreateEmergencyContactDTO
  ): Promise<EmergencyContact> {
    try {
      // Validate contact information
      const validation = validateContactInfo(data.phoneNumber, data.email);

      if (!validation.isValid) {
        throw new AppError(
          `Invalid contact information: ${validation.errors.join(', ')}`,
          400,
          'INVALID_CONTACT_INFO'
        );
      }

      // Check contact limit (max 10 contacts per user)
      const existingContactsCount = await EmergencyContact.count({
        where: { userId },
      });

      if (existingContactsCount >= 10) {
        throw new AppError(
          'Maximum number of emergency contacts (10) reached',
          400,
          'CONTACT_LIMIT_REACHED'
        );
      }

      // Format phone number and sanitize email
      const formattedPhone = validation.formattedPhone || data.phoneNumber;
      const sanitizedEmail = validation.sanitizedEmail;

      // Create the contact
      const contact = await EmergencyContact.create({
        userId,
        userProfileId,
        name: data.name,
        phoneNumber: formattedPhone,
        email: sanitizedEmail,
        relationship: data.relationship,
        priority: data.priority,
        address: data.address,
        notes: data.notes,
      });

      logger.info(`Created emergency contact: ${contact.id} for user: ${userId}`);
      return contact;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error creating emergency contact:', error);
      throw new AppError('Failed to create emergency contact', 500, 'CREATE_CONTACT_ERROR');
    }
  }

  /**
   * Update an emergency contact
   */
  public async updateContact(
    userId: string,
    contactId: string,
    updates: UpdateEmergencyContactDTO
  ): Promise<EmergencyContact> {
    try {
      const contact = await this.getContactById(userId, contactId);

      // Validate phone number if it's being updated
      if (updates.phoneNumber) {
        const validation = validateContactInfo(updates.phoneNumber, updates.email || contact.email);

        if (!validation.isValid) {
          throw new AppError(
            `Invalid contact information: ${validation.errors.join(', ')}`,
            400,
            'INVALID_CONTACT_INFO'
          );
        }

        updates.phoneNumber = validation.formattedPhone || updates.phoneNumber;
      }

      // Sanitize email if it's being updated
      if (updates.email) {
        updates.email = sanitizeEmail(updates.email);
      }

      // Update the contact
      await contact.update(updates);

      logger.info(`Updated emergency contact: ${contactId} for user: ${userId}`);
      return contact;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error updating emergency contact:', error);
      throw new AppError('Failed to update emergency contact', 500, 'UPDATE_CONTACT_ERROR');
    }
  }

  /**
   * Delete an emergency contact (soft delete)
   */
  public async deleteContact(userId: string, contactId: string): Promise<void> {
    try {
      const contact = await this.getContactById(userId, contactId);

      // Soft delete the contact
      await contact.destroy();

      logger.info(`Deleted emergency contact: ${contactId} for user: ${userId}`);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error deleting emergency contact:', error);
      throw new AppError('Failed to delete emergency contact', 500, 'DELETE_CONTACT_ERROR');
    }
  }

  /**
   * Mark a contact as verified
   */
  public async verifyContact(userId: string, contactId: string): Promise<EmergencyContact> {
    try {
      const contact = await this.getContactById(userId, contactId);

      await contact.update({
        isVerified: true,
      });

      logger.info(`Verified emergency contact: ${contactId} for user: ${userId}`);
      return contact;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error verifying emergency contact:', error);
      throw new AppError('Failed to verify emergency contact', 500, 'VERIFY_CONTACT_ERROR');
    }
  }

  /**
   * Get primary emergency contacts
   */
  public async getPrimaryContacts(userId: string): Promise<EmergencyContact[]> {
    try {
      return await this.getUserContacts(userId, {
        priority: ContactPriority.PRIMARY,
        includeUnverified: false,
      });
    } catch (error) {
      logger.error('Error fetching primary contacts:', error);
      throw new AppError('Failed to fetch primary contacts', 500, 'FETCH_PRIMARY_CONTACTS_ERROR');
    }
  }

  /**
   * Update last notified timestamp
   * Called when a contact is notified during an emergency
   */
  public async updateLastNotified(contactId: string): Promise<void> {
    try {
      const contact = await EmergencyContact.findByPk(contactId);

      if (!contact) {
        throw new AppError('Emergency contact not found', 404, 'CONTACT_NOT_FOUND');
      }

      await contact.update({
        lastNotifiedAt: new Date(),
      });

      logger.info(`Updated last notified timestamp for contact: ${contactId}`);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error updating last notified:', error);
      throw new AppError('Failed to update last notified', 500, 'UPDATE_NOTIFIED_ERROR');
    }
  }

  /**
   * Get contacts by priority level
   */
  public async getContactsByPriority(
    userId: string,
    priority: ContactPriority
  ): Promise<EmergencyContact[]> {
    try {
      return await this.getUserContacts(userId, {
        priority,
        includeUnverified: false,
      });
    } catch (error) {
      logger.error(`Error fetching ${priority} contacts:`, error);
      throw new AppError(`Failed to fetch ${priority} contacts`, 500, 'FETCH_PRIORITY_ERROR');
    }
  }

  /**
   * Get all verified contacts for emergency notification
   */
  public async getVerifiedContacts(userId: string): Promise<EmergencyContact[]> {
    try {
      const contacts = await EmergencyContact.findAll({
        where: {
          userId,
          isVerified: true,
        },
        order: [
          ['priority', 'ASC'],
          ['createdAt', 'DESC'],
        ],
      });

      return contacts;
    } catch (error) {
      logger.error('Error fetching verified contacts:', error);
      throw new AppError('Failed to fetch verified contacts', 500, 'FETCH_VERIFIED_ERROR');
    }
  }

  /**
   * Count user's emergency contacts
   */
  public async countUserContacts(userId: string): Promise<number> {
    try {
      return await EmergencyContact.count({
        where: { userId },
      });
    } catch (error) {
      logger.error('Error counting contacts:', error);
      throw new AppError('Failed to count contacts', 500, 'COUNT_CONTACTS_ERROR');
    }
  }

  /**
   * Check if user has any primary contacts
   */
  public async hasPrimaryContact(userId: string): Promise<boolean> {
    try {
      const count = await EmergencyContact.count({
        where: {
          userId,
          priority: ContactPriority.PRIMARY,
        },
      });

      return count > 0;
    } catch (error) {
      logger.error('Error checking primary contact:', error);
      return false;
    }
  }

  /**
   * Get contact statistics for a user
   */
  public async getContactStats(userId: string): Promise<{
    total: number;
    verified: number;
    unverified: number;
    byPriority: {
      primary: number;
      secondary: number;
      tertiary: number;
    };
  }> {
    try {
      const [total, verified, primary, secondary, tertiary] = await Promise.all([
        EmergencyContact.count({ where: { userId } }),
        EmergencyContact.count({ where: { userId, isVerified: true } }),
        EmergencyContact.count({ where: { userId, priority: ContactPriority.PRIMARY } }),
        EmergencyContact.count({ where: { userId, priority: ContactPriority.SECONDARY } }),
        EmergencyContact.count({ where: { userId, priority: ContactPriority.TERTIARY } }),
      ]);

      return {
        total,
        verified,
        unverified: total - verified,
        byPriority: {
          primary,
          secondary,
          tertiary,
        },
      };
    } catch (error) {
      logger.error('Error getting contact stats:', error);
      throw new AppError('Failed to get contact statistics', 500, 'GET_STATS_ERROR');
    }
  }
}

export default new EmergencyContactService();
