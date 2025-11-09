import EmergencyContact, { ContactRelationship } from '../models/EmergencyContact';
import UserProfile from '../models/UserProfile';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { validatePhoneNumber } from '../utils/phoneValidator';
import config from '../config';

export interface CreateContactData {
  name: string;
  relationship: ContactRelationship;
  phoneNumber: string;
  alternatePhoneNumber?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  isPrimary?: boolean;
  priority?: number;
  notes?: string;
}

export interface UpdateContactData {
  name?: string;
  relationship?: ContactRelationship;
  phoneNumber?: string;
  alternatePhoneNumber?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  isPrimary?: boolean;
  priority?: number;
  notes?: string;
}

class EmergencyContactService {
  /**
   * Get all emergency contacts for a user
   */
  public async getContacts(userId: string): Promise<EmergencyContact[]> {
    try {
      // Get user profile
      const profile = await UserProfile.findOne({ where: { userId } });

      if (!profile) {
        // Return empty array if no profile exists
        return [];
      }

      // Get all contacts ordered by priority
      const contacts = await EmergencyContact.findAll({
        where: { userProfileId: profile.id },
        order: [
          ['isPrimary', 'DESC'],
          ['priority', 'ASC'],
          ['createdAt', 'ASC'],
        ],
      });

      return contacts;
    } catch (error) {
      logger.error(`Error getting contacts for user ${userId}:`, error);
      throw new AppError('Failed to get emergency contacts', 500, 'CONTACTS_GET_ERROR');
    }
  }

  /**
   * Get specific emergency contact by ID
   */
  public async getContactById(
    contactId: string,
    userId: string
  ): Promise<EmergencyContact> {
    try {
      // Get user profile
      const profile = await UserProfile.findOne({ where: { userId } });

      if (!profile) {
        throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      // Get contact
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
      logger.error(`Error getting contact ${contactId}:`, error);
      throw new AppError('Failed to get emergency contact', 500, 'CONTACT_GET_ERROR');
    }
  }

  /**
   * Create new emergency contact
   */
  public async createContact(
    userId: string,
    data: CreateContactData
  ): Promise<EmergencyContact> {
    try {
      // Get or create user profile
      let profile = await UserProfile.findOne({ where: { userId } });

      if (!profile) {
        profile = await UserProfile.create({
          userId,
          isActive: true,
        });
      }

      // Check contact limit
      const contactCount = await EmergencyContact.count({
        where: { userProfileId: profile.id },
      });

      if (contactCount >= config.emergencyContacts.maxContacts) {
        throw new AppError(
          `Maximum ${config.emergencyContacts.maxContacts} emergency contacts allowed`,
          400,
          'MAX_CONTACTS_REACHED'
        );
      }

      // Validate phone number
      const phoneValidation = validatePhoneNumber(data.phoneNumber);
      if (!phoneValidation.isValid) {
        throw new AppError(
          phoneValidation.message || 'Invalid phone number',
          400,
          'INVALID_PHONE_NUMBER'
        );
      }
      data.phoneNumber = phoneValidation.formatted!;

      // Validate alternate phone number if provided
      if (data.alternatePhoneNumber) {
        const altPhoneValidation = validatePhoneNumber(data.alternatePhoneNumber);
        if (!altPhoneValidation.isValid) {
          throw new AppError(
            'Invalid alternate phone number',
            400,
            'INVALID_ALTERNATE_PHONE'
          );
        }
        data.alternatePhoneNumber = altPhoneValidation.formatted;
      }

      // If setting as primary, unset current primary
      if (data.isPrimary) {
        await EmergencyContact.update(
          { isPrimary: false },
          {
            where: {
              userProfileId: profile.id,
              isPrimary: true,
            },
          }
        );
      }

      // Create contact
      const contact = await EmergencyContact.create({
        userProfileId: profile.id,
        ...data,
        isActive: true,
      });

      logger.info(`Emergency contact created for user ${userId}`);

      return contact;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error(`Error creating contact for user ${userId}:`, error);
      throw new AppError('Failed to create emergency contact', 500, 'CONTACT_CREATE_ERROR');
    }
  }

  /**
   * Update emergency contact
   */
  public async updateContact(
    contactId: string,
    userId: string,
    data: UpdateContactData
  ): Promise<EmergencyContact> {
    try {
      // Get user profile
      const profile = await UserProfile.findOne({ where: { userId } });

      if (!profile) {
        throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      // Get contact
      const contact = await EmergencyContact.findOne({
        where: {
          id: contactId,
          userProfileId: profile.id,
        },
      });

      if (!contact) {
        throw new AppError('Emergency contact not found', 404, 'CONTACT_NOT_FOUND');
      }

      // Validate phone number if provided
      if (data.phoneNumber) {
        const phoneValidation = validatePhoneNumber(data.phoneNumber);
        if (!phoneValidation.isValid) {
          throw new AppError(
            phoneValidation.message || 'Invalid phone number',
            400,
            'INVALID_PHONE_NUMBER'
          );
        }
        data.phoneNumber = phoneValidation.formatted;
      }

      // Validate alternate phone number if provided
      if (data.alternatePhoneNumber) {
        const altPhoneValidation = validatePhoneNumber(data.alternatePhoneNumber);
        if (!altPhoneValidation.isValid) {
          throw new AppError(
            'Invalid alternate phone number',
            400,
            'INVALID_ALTERNATE_PHONE'
          );
        }
        data.alternatePhoneNumber = altPhoneValidation.formatted;
      }

      // If setting as primary, unset current primary
      if (data.isPrimary && !contact.isPrimary) {
        await EmergencyContact.update(
          { isPrimary: false },
          {
            where: {
              userProfileId: profile.id,
              isPrimary: true,
            },
          }
        );
      }

      // Update contact
      await contact.update(data);

      logger.info(`Emergency contact ${contactId} updated for user ${userId}`);

      return contact;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error(`Error updating contact ${contactId}:`, error);
      throw new AppError('Failed to update emergency contact', 500, 'CONTACT_UPDATE_ERROR');
    }
  }

  /**
   * Delete emergency contact (soft delete)
   */
  public async deleteContact(contactId: string, userId: string): Promise<void> {
    try {
      // Get user profile
      const profile = await UserProfile.findOne({ where: { userId } });

      if (!profile) {
        throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      // Get contact
      const contact = await EmergencyContact.findOne({
        where: {
          id: contactId,
          userProfileId: profile.id,
        },
      });

      if (!contact) {
        throw new AppError('Emergency contact not found', 404, 'CONTACT_NOT_FOUND');
      }

      // Soft delete
      await contact.destroy();

      logger.info(`Emergency contact ${contactId} deleted for user ${userId}`);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error(`Error deleting contact ${contactId}:`, error);
      throw new AppError('Failed to delete emergency contact', 500, 'CONTACT_DELETE_ERROR');
    }
  }

  /**
   * Set contact as primary
   */
  public async setPrimaryContact(contactId: string, userId: string): Promise<EmergencyContact> {
    try {
      return await this.updateContact(contactId, userId, { isPrimary: true });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get primary contact
   */
  public async getPrimaryContact(userId: string): Promise<EmergencyContact | null> {
    try {
      const profile = await UserProfile.findOne({ where: { userId } });

      if (!profile) {
        return null;
      }

      const contact = await EmergencyContact.findOne({
        where: {
          userProfileId: profile.id,
          isPrimary: true,
        },
      });

      return contact;
    } catch (error) {
      logger.error(`Error getting primary contact for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get contact count for user
   */
  public async getContactCount(userId: string): Promise<number> {
    try {
      const profile = await UserProfile.findOne({ where: { userId } });

      if (!profile) {
        return 0;
      }

      return await EmergencyContact.count({
        where: { userProfileId: profile.id },
      });
    } catch (error) {
      logger.error(`Error getting contact count for user ${userId}:`, error);
      return 0;
    }
  }
}

export default new EmergencyContactService();
