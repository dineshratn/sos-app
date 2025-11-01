import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import userService from '../../services/user.service';
import UserProfile from '../../models/UserProfile';
import { AppError } from '../../middleware/errorHandler';

// Mock the UserProfile model
jest.mock('../../models/UserProfile');

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should return user profile when it exists', async () => {
      const mockProfile = {
        id: 'profile-123',
        userId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      (UserProfile.findOne as jest.Mock).mockResolvedValue(mockProfile);

      const result = await userService.getUserProfile('user-123');

      expect(result).toEqual(mockProfile);
      expect(UserProfile.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });

    it('should throw AppError when profile not found', async () => {
      (UserProfile.findOne as jest.Mock).mockResolvedValue(null);

      await expect(userService.getUserProfile('user-123')).rejects.toThrow(AppError);
      await expect(userService.getUserProfile('user-123')).rejects.toThrow('User profile not found');
    });

    it('should handle database errors', async () => {
      (UserProfile.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(userService.getUserProfile('user-123')).rejects.toThrow(AppError);
      await expect(userService.getUserProfile('user-123')).rejects.toThrow(
        'Failed to fetch user profile'
      );
    });
  });

  describe('getOrCreateUserProfile', () => {
    it('should return existing profile if found', async () => {
      const mockProfile = {
        id: 'profile-123',
        userId: 'user-123',
        firstName: 'John',
      };

      (UserProfile.findOne as jest.Mock).mockResolvedValue(mockProfile);

      const result = await userService.getOrCreateUserProfile('user-123');

      expect(result).toEqual(mockProfile);
      expect(UserProfile.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
      expect(UserProfile.create).not.toHaveBeenCalled();
    });

    it('should create new profile if not found', async () => {
      const mockNewProfile = {
        id: 'profile-456',
        userId: 'user-456',
      };

      (UserProfile.findOne as jest.Mock).mockResolvedValue(null);
      (UserProfile.create as jest.Mock).mockResolvedValue(mockNewProfile);

      const result = await userService.getOrCreateUserProfile('user-456');

      expect(result).toEqual(mockNewProfile);
      expect(UserProfile.create).toHaveBeenCalledWith({
        userId: 'user-456',
      });
    });
  });

  describe('createUserProfile', () => {
    it('should create new profile successfully', async () => {
      const profileData = {
        userId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      const mockCreatedProfile = {
        id: 'profile-123',
        ...profileData,
      };

      (UserProfile.findOne as jest.Mock).mockResolvedValue(null);
      (UserProfile.create as jest.Mock).mockResolvedValue(mockCreatedProfile);

      const result = await userService.createUserProfile(profileData);

      expect(result).toEqual(mockCreatedProfile);
      expect(UserProfile.create).toHaveBeenCalledWith(profileData);
    });

    it('should throw error if profile already exists', async () => {
      const profileData = {
        userId: 'user-123',
        firstName: 'John',
      };

      (UserProfile.findOne as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(userService.createUserProfile(profileData)).rejects.toThrow(AppError);
      await expect(userService.createUserProfile(profileData)).rejects.toThrow(
        'User profile already exists'
      );
    });
  });

  describe('updateUserProfile', () => {
    it('should update profile successfully', async () => {
      const updates = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const mockProfile = {
        id: 'profile-123',
        userId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        update: jest.fn().mockResolvedValue(true),
      };

      (UserProfile.findOne as jest.Mock).mockResolvedValue(mockProfile);

      const result = await userService.updateUserProfile('user-123', updates);

      expect(mockProfile.update).toHaveBeenCalledWith(updates);
      expect(result).toBe(mockProfile);
    });

    it('should throw error if profile not found', async () => {
      (UserProfile.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        userService.updateUserProfile('user-123', { firstName: 'Jane' })
      ).rejects.toThrow(AppError);
    });
  });

  describe('deleteUserProfile', () => {
    it('should soft delete profile successfully', async () => {
      const mockProfile = {
        id: 'profile-123',
        userId: 'user-123',
        destroy: jest.fn().mockResolvedValue(true),
      };

      (UserProfile.findOne as jest.Mock).mockResolvedValue(mockProfile);

      await userService.deleteUserProfile('user-123');

      expect(mockProfile.destroy).toHaveBeenCalled();
    });

    it('should throw error if profile not found', async () => {
      (UserProfile.findOne as jest.Mock).mockResolvedValue(null);

      await expect(userService.deleteUserProfile('user-123')).rejects.toThrow(AppError);
    });
  });

  describe('hardDeleteUserProfile', () => {
    it('should permanently delete profile', async () => {
      const mockProfile = {
        id: 'profile-123',
        userId: 'user-123',
        destroy: jest.fn().mockResolvedValue(true),
      };

      (UserProfile.findOne as jest.Mock).mockResolvedValue(mockProfile);

      await userService.hardDeleteUserProfile('user-123');

      expect(mockProfile.destroy).toHaveBeenCalledWith({ force: true });
    });

    it('should throw error if profile not found', async () => {
      (UserProfile.findOne as jest.Mock).mockResolvedValue(null);

      await expect(userService.hardDeleteUserProfile('user-123')).rejects.toThrow(AppError);
    });
  });

  describe('updateProfilePicture', () => {
    it('should update profile picture URL', async () => {
      const pictureUrl = 'https://example.com/picture.jpg';

      const mockProfile = {
        id: 'profile-123',
        userId: 'user-123',
        update: jest.fn().mockResolvedValue(true),
      };

      (UserProfile.findOne as jest.Mock).mockResolvedValue(mockProfile);

      await userService.updateProfilePicture('user-123', pictureUrl);

      expect(mockProfile.update).toHaveBeenCalledWith({
        profilePictureUrl: pictureUrl,
      });
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should merge and update notification preferences', async () => {
      const existingPreferences = {
        email: true,
        sms: false,
      };

      const newPreferences = {
        push: true,
      };

      const mockProfile = {
        id: 'profile-123',
        userId: 'user-123',
        notificationPreferences: existingPreferences,
        update: jest.fn().mockResolvedValue(true),
      };

      (UserProfile.findOne as jest.Mock).mockResolvedValue(mockProfile);

      await userService.updateNotificationPreferences('user-123', newPreferences);

      expect(mockProfile.update).toHaveBeenCalledWith({
        notificationPreferences: {
          ...existingPreferences,
          ...newPreferences,
        },
      });
    });
  });

  describe('getUserAge', () => {
    it('should calculate age correctly', async () => {
      const mockProfile = {
        id: 'profile-123',
        userId: 'user-123',
        getAge: jest.fn().mockReturnValue(30),
      };

      (UserProfile.findOne as jest.Mock).mockResolvedValue(mockProfile);

      const age = await userService.getUserAge('user-123');

      expect(age).toBe(30);
      expect(mockProfile.getAge).toHaveBeenCalled();
    });

    it('should return null if date of birth not set', async () => {
      const mockProfile = {
        id: 'profile-123',
        userId: 'user-123',
        getAge: jest.fn().mockReturnValue(null),
      };

      (UserProfile.findOne as jest.Mock).mockResolvedValue(mockProfile);

      const age = await userService.getUserAge('user-123');

      expect(age).toBeNull();
    });
  });

  describe('searchUsersByName', () => {
    it('should search users by first and last name', async () => {
      const mockProfiles = [
        { id: '1', firstName: 'John', lastName: 'Doe' },
        { id: '2', firstName: 'Jane', lastName: 'Doe' },
      ];

      (UserProfile.findAll as jest.Mock).mockResolvedValue(mockProfiles);

      const result = await userService.searchUsersByName('Doe', 20);

      expect(result).toEqual(mockProfiles);
      expect(UserProfile.findAll).toHaveBeenCalled();
    });

    it('should limit results based on limit parameter', async () => {
      (UserProfile.findAll as jest.Mock).mockResolvedValue([]);

      await userService.searchUsersByName('test', 10);

      expect(UserProfile.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
        })
      );
    });
  });

  describe('getRecentProfiles', () => {
    it('should return recent profiles', async () => {
      const mockProfiles = [
        { id: '1', createdAt: new Date('2023-01-02') },
        { id: '2', createdAt: new Date('2023-01-01') },
      ];

      (UserProfile.findAll as jest.Mock).mockResolvedValue(mockProfiles);

      const result = await userService.getRecentProfiles(20);

      expect(result).toEqual(mockProfiles);
      expect(UserProfile.findAll).toHaveBeenCalledWith({
        limit: 20,
        order: [['createdAt', 'DESC']],
      });
    });
  });
});
