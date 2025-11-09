import EmergencyContact, {
  ContactPriority,
  ContactRelationship,
} from '../models/EmergencyContact';
import UserProfile from '../models/UserProfile';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import {
  validateContactInfo,
  sanitizeEmail,
} from '../utils/contactValidation';

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
      // Get user profile first
      const profile = await UserProfile.findOne({ where: { userId } });

      if (!profile) {
        return [];
      }

      const where: any = { userProfileId: profile.id };

      // Filter by priority if specified
      if (options?.priority) {
        where.priority = options.priority;
      }

      // Filter by verification status
      if (options?.includeUnverified === false) {
        where.isActive = true;
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
      // Get user profile first
      const profile = await UserProfile.findOne({ where: { userId } });

      if (!profile) {
        throw new AppError('User profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      const contact = await EmergencyContact.findOne({
        where: {
          id: contactId,
          userProfileId: profile.id,
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
        where: { userProfileId },
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
        isActive: true,
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
        priority: ContactPriority.CRITICAL,
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

      // Note: lastNotifiedAt field should be added to EmergencyContact model if needed
      // For now, just log the notification
      logger.info(`Contact ${contactId} was notified during emergency`);
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
      // Get user profile first
      const profile = await UserProfile.findOne({ where: { userId } });

      if (!profile) {
        return [];
      }

      const contacts = await EmergencyContact.findAll({
        where: {
          userProfileId: profile.id,
          isActive: true,
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
      // Get user profile first
      const profile = await UserProfile.findOne({ where: { userId } });

      if (!profile) {
        return 0;
      }

      return await EmergencyContact.count({
        where: { userProfileId: profile.id },
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
      // Get user profile first
      const profile = await UserProfile.findOne({ where: { userId } });

      if (!profile) {
        return false;
      }

      const count = await EmergencyContact.count({
        where: {
          userProfileId: profile.id,
          isPrimary: true,
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
    active: number;
    inactive: number;
    byPriority: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  }> {
    try {
      // Get user profile first
      const profile = await UserProfile.findOne({ where: { userId } });

      if (!profile) {
        return {
          total: 0,
          active: 0,
          inactive: 0,
          byPriority: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
          },
        };
      }

      const [total, active, critical, high, medium, low] = await Promise.all([
        EmergencyContact.count({ where: { userProfileId: profile.id } }),
        EmergencyContact.count({ where: { userProfileId: profile.id, isActive: true } }),
        EmergencyContact.count({ where: { userProfileId: profile.id, priority: ContactPriority.CRITICAL } }),
        EmergencyContact.count({ where: { userProfileId: profile.id, priority: ContactPriority.HIGH } }),
        EmergencyContact.count({ where: { userProfileId: profile.id, priority: ContactPriority.MEDIUM } }),
        EmergencyContact.count({ where: { userProfileId: profile.id, priority: ContactPriority.LOW } }),
      ]);

      return {
        total,
        active,
        inactive: total - active,
        byPriority: {
          critical,
          high,
          medium,
          low,
        },
      };
    } catch (error) {
      logger.error('Error getting contact stats:', error);
      throw new AppError('Failed to get contact statistics', 500, 'GET_STATS_ERROR');
    }
  }
}

export default new EmergencyContactService();
