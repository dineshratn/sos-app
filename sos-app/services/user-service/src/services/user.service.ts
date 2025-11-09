import UserProfile from '../models/UserProfile';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { Op } from 'sequelize';

/**
 * User Profile Service
 *
 * Handles all business logic related to user profiles including:
 * - Profile creation
 * - Profile retrieval
 * - Profile updates
 * - Profile deletion (with GDPR compliance)
 */

export interface CreateUserProfileDTO {
  userId: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  profilePictureUrl?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
  language?: string;
  notificationPreferences?: Record<string, any>;
}

export interface UpdateUserProfileDTO {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  profilePictureUrl?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
  language?: string;
  notificationPreferences?: Record<string, any>;
}

class UserService {
  /**
   * Get user profile by user ID
   */
  public async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const profile = await UserProfile.findOne({
        where: { userId },
      });

      if (!profile) {
        throw new AppError('User profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      return profile;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error fetching user profile:', error);
      throw new AppError('Failed to fetch user profile', 500, 'FETCH_PROFILE_ERROR');
    }
  }

  /**
   * Get or create user profile
   * Creates a profile if one doesn't exist for the user
   */
  public async getOrCreateUserProfile(userId: string): Promise<UserProfile> {
    try {
      let profile = await UserProfile.findOne({
        where: { userId },
      });

      if (!profile) {
        profile = await UserProfile.create({
          userId,
        });
        logger.info(`Created new profile for user: ${userId}`);
      }

      return profile;
    } catch (error) {
      logger.error('Error getting/creating user profile:', error);
      throw new AppError('Failed to get or create user profile', 500, 'PROFILE_ERROR');
    }
  }

  /**
   * Create a new user profile
   */
  public async createUserProfile(data: CreateUserProfileDTO): Promise<UserProfile> {
    try {
      // Check if profile already exists
      const existingProfile = await UserProfile.findOne({
        where: { userId: data.userId },
      });

      if (existingProfile) {
        throw new AppError('User profile already exists', 409, 'PROFILE_EXISTS');
      }

      // Create new profile
      const profile = await UserProfile.create(data);

      logger.info(`Created user profile: ${profile.id} for user: ${data.userId}`);
      return profile;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error creating user profile:', error);
      throw new AppError('Failed to create user profile', 500, 'CREATE_PROFILE_ERROR');
    }
  }

  /**
   * Update user profile
   */
  public async updateUserProfile(
    userId: string,
    updates: UpdateUserProfileDTO
  ): Promise<UserProfile> {
    try {
      const profile = await this.getUserProfile(userId);

      // Update profile fields
      await profile.update(updates);

      logger.info(`Updated user profile: ${profile.id} for user: ${userId}`);
      return profile;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error updating user profile:', error);
      throw new AppError('Failed to update user profile', 500, 'UPDATE_PROFILE_ERROR');
    }
  }

  /**
   * Delete user profile (soft delete)
   * GDPR compliance: marks profile as deleted without removing data immediately
   */
  public async deleteUserProfile(userId: string): Promise<void> {
    try {
      const profile = await this.getUserProfile(userId);

      // Soft delete the profile
      await profile.destroy();

      logger.info(`Soft deleted user profile: ${profile.id} for user: ${userId}`);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error deleting user profile:', error);
      throw new AppError('Failed to delete user profile', 500, 'DELETE_PROFILE_ERROR');
    }
  }

  /**
   * Hard delete user profile (GDPR right to erasure)
   * Permanently removes all user data from the system
   */
  public async hardDeleteUserProfile(userId: string): Promise<void> {
    try {
      const profile = await UserProfile.findOne({
        where: { userId },
        paranoid: false, // Include soft-deleted records
      });

      if (!profile) {
        throw new AppError('User profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      // Permanently delete the profile
      await profile.destroy({ force: true });

      logger.info(`Hard deleted user profile: ${profile.id} for user: ${userId}`);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error hard deleting user profile:', error);
      throw new AppError('Failed to permanently delete user profile', 500, 'HARD_DELETE_ERROR');
    }
  }

  /**
   * Update profile picture URL
   */
  public async updateProfilePicture(userId: string, pictureUrl: string): Promise<UserProfile> {
    try {
      const profile = await this.getUserProfile(userId);

      await profile.update({
        profilePictureUrl: pictureUrl,
      });

      logger.info(`Updated profile picture for user: ${userId}`);
      return profile;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error updating profile picture:', error);
      throw new AppError('Failed to update profile picture', 500, 'UPDATE_PICTURE_ERROR');
    }
  }

  /**
   * Update notification preferences
   */
  public async updateNotificationPreferences(
    userId: string,
    preferences: Record<string, any>
  ): Promise<UserProfile> {
    try {
      const profile = await this.getUserProfile(userId);

      // Merge existing preferences with new ones
      const currentPreferences = profile.notificationPreferences || {};
      const updatedPreferences = {
        ...currentPreferences,
        ...preferences,
      };

      await profile.update({
        notificationPreferences: updatedPreferences,
      });

      logger.info(`Updated notification preferences for user: ${userId}`);
      return profile;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error updating notification preferences:', error);
      throw new AppError(
        'Failed to update notification preferences',
        500,
        'UPDATE_PREFERENCES_ERROR'
      );
    }
  }

  /**
   * Get user's age from date of birth
   */
  public async getUserAge(userId: string): Promise<number | null> {
    try {
      const profile = await this.getUserProfile(userId);
      return profile.getAge();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error calculating user age:', error);
      throw new AppError('Failed to calculate user age', 500, 'AGE_CALCULATION_ERROR');
    }
  }

  /**
   * Search users by name (for admin purposes)
   */
  public async searchUsersByName(
    searchTerm: string,
    limit: number = 20
  ): Promise<UserProfile[]> {
    try {
      const profiles = await UserProfile.findAll({
        where: {
          [Op.or]: [
            { firstName: { [Op.iLike]: `%${searchTerm}%` } },
            { lastName: { [Op.iLike]: `%${searchTerm}%` } },
          ],
        },
        limit,
        order: [['createdAt', 'DESC']],
      });

      return profiles;
    } catch (error) {
      logger.error('Error searching users by name:', error);
      throw new AppError('Failed to search users', 500, 'SEARCH_ERROR');
    }
  }

  /**
   * Get recently created profiles (for admin purposes)
   */
  public async getRecentProfiles(limit: number = 20): Promise<UserProfile[]> {
    try {
      const profiles = await UserProfile.findAll({
        limit,
        order: [['createdAt', 'DESC']],
      });

      return profiles;
    } catch (error) {
      logger.error('Error fetching recent profiles:', error);
      throw new AppError('Failed to fetch recent profiles', 500, 'FETCH_RECENT_ERROR');
    }
  }
}

export default new UserService();
