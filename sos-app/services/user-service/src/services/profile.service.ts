import UserProfile from '../models/UserProfile';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { validatePhoneNumber } from '../utils/phoneValidator';

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  medicalConditions?: string;
  allergies?: string;
  medications?: string;
  emergencyNotes?: string;
  profilePictureUrl?: string;
}

class ProfileService {
  /**
   * Get user profile by user ID
   * Creates profile if it doesn't exist
   */
  public async getProfile(userId: string): Promise<UserProfile> {
    try {
      let profile = await UserProfile.findOne({
        where: { userId },
        include: ['emergencyContacts'],
      });

      // Create profile if it doesn't exist
      if (!profile) {
        profile = await UserProfile.create({
          userId,
          isActive: true,
        });

        logger.info(`New profile created for user: ${userId}`);
      }

      return profile;
    } catch (error) {
      logger.error(`Error getting profile for user ${userId}:`, error);
      throw new AppError('Failed to get user profile', 500, 'PROFILE_GET_ERROR');
    }
  }

  /**
   * Update user profile
   */
  public async updateProfile(
    userId: string,
    data: UpdateProfileData
  ): Promise<UserProfile> {
    try {
      // Get or create profile
      let profile = await UserProfile.findOne({ where: { userId } });

      if (!profile) {
        profile = await UserProfile.create({
          userId,
          isActive: true,
        });
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
        // Use formatted phone number
        data.phoneNumber = phoneValidation.formatted;
      }

      // Validate date of birth if provided
      if (data.dateOfBirth) {
        const dob = new Date(data.dateOfBirth);
        const today = new Date();

        if (dob > today) {
          throw new AppError(
            'Date of birth cannot be in the future',
            400,
            'INVALID_DATE_OF_BIRTH'
          );
        }

        const age = today.getFullYear() - dob.getFullYear();
        if (age > 150) {
          throw new AppError(
            'Invalid date of birth',
            400,
            'INVALID_DATE_OF_BIRTH'
          );
        }
      }

      // Update profile
      await profile.update(data);

      logger.info(`Profile updated for user: ${userId}`);

      return profile;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error(`Error updating profile for user ${userId}:`, error);
      throw new AppError('Failed to update user profile', 500, 'PROFILE_UPDATE_ERROR');
    }
  }

  /**
   * Delete user profile (soft delete)
   */
  public async deleteProfile(userId: string): Promise<void> {
    try {
      const profile = await UserProfile.findOne({ where: { userId } });

      if (!profile) {
        throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      // Soft delete (paranoid mode)
      await profile.destroy();

      logger.info(`Profile deleted for user: ${userId}`);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error(`Error deleting profile for user ${userId}:`, error);
      throw new AppError('Failed to delete user profile', 500, 'PROFILE_DELETE_ERROR');
    }
  }

  /**
   * Check if profile exists
   */
  public async profileExists(userId: string): Promise<boolean> {
    try {
      const count = await UserProfile.count({ where: { userId } });
      return count > 0;
    } catch (error) {
      logger.error(`Error checking profile existence for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get profile by ID (internal use)
   */
  public async getProfileById(profileId: string): Promise<UserProfile | null> {
    try {
      return await UserProfile.findByPk(profileId);
    } catch (error) {
      logger.error(`Error getting profile by ID ${profileId}:`, error);
      return null;
    }
  }
}

export default new ProfileService();
