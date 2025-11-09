"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const globals_1 = require("@jest/globals");
const user_service_1 = __importDefault(require("../../services/user.service"));
const UserProfile_1 = __importDefault(require("../../models/UserProfile"));
const errorHandler_1 = require("../../middleware/errorHandler");
// Mock the UserProfile model
globals_1.jest.mock('../../models/UserProfile');
(0, globals_1.describe)('UserService', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('getUserProfile', () => {
        (0, globals_1.it)('should return user profile when it exists', async () => {
            const mockProfile = {
                id: 'profile-123',
                userId: 'user-123',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
            };
            UserProfile_1.default.findOne.mockResolvedValue(mockProfile);
            const result = await user_service_1.default.getUserProfile('user-123');
            (0, globals_1.expect)(result).toEqual(mockProfile);
            (0, globals_1.expect)(UserProfile_1.default.findOne).toHaveBeenCalledWith({
                where: { userId: 'user-123' },
            });
        });
        (0, globals_1.it)('should throw AppError when profile not found', async () => {
            UserProfile_1.default.findOne.mockResolvedValue(null);
            await (0, globals_1.expect)(user_service_1.default.getUserProfile('user-123')).rejects.toThrow(errorHandler_1.AppError);
            await (0, globals_1.expect)(user_service_1.default.getUserProfile('user-123')).rejects.toThrow('User profile not found');
        });
        (0, globals_1.it)('should handle database errors', async () => {
            UserProfile_1.default.findOne.mockRejectedValue(new Error('Database error'));
            await (0, globals_1.expect)(user_service_1.default.getUserProfile('user-123')).rejects.toThrow(errorHandler_1.AppError);
            await (0, globals_1.expect)(user_service_1.default.getUserProfile('user-123')).rejects.toThrow('Failed to fetch user profile');
        });
    });
    (0, globals_1.describe)('getOrCreateUserProfile', () => {
        (0, globals_1.it)('should return existing profile if found', async () => {
            const mockProfile = {
                id: 'profile-123',
                userId: 'user-123',
                firstName: 'John',
            };
            UserProfile_1.default.findOne.mockResolvedValue(mockProfile);
            const result = await user_service_1.default.getOrCreateUserProfile('user-123');
            (0, globals_1.expect)(result).toEqual(mockProfile);
            (0, globals_1.expect)(UserProfile_1.default.findOne).toHaveBeenCalledWith({
                where: { userId: 'user-123' },
            });
            (0, globals_1.expect)(UserProfile_1.default.create).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should create new profile if not found', async () => {
            const mockNewProfile = {
                id: 'profile-456',
                userId: 'user-456',
            };
            UserProfile_1.default.findOne.mockResolvedValue(null);
            UserProfile_1.default.create.mockResolvedValue(mockNewProfile);
            const result = await user_service_1.default.getOrCreateUserProfile('user-456');
            (0, globals_1.expect)(result).toEqual(mockNewProfile);
            (0, globals_1.expect)(UserProfile_1.default.create).toHaveBeenCalledWith({
                userId: 'user-456',
            });
        });
    });
    (0, globals_1.describe)('createUserProfile', () => {
        (0, globals_1.it)('should create new profile successfully', async () => {
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
            UserProfile_1.default.findOne.mockResolvedValue(null);
            UserProfile_1.default.create.mockResolvedValue(mockCreatedProfile);
            const result = await user_service_1.default.createUserProfile(profileData);
            (0, globals_1.expect)(result).toEqual(mockCreatedProfile);
            (0, globals_1.expect)(UserProfile_1.default.create).toHaveBeenCalledWith(profileData);
        });
        (0, globals_1.it)('should throw error if profile already exists', async () => {
            const profileData = {
                userId: 'user-123',
                firstName: 'John',
            };
            UserProfile_1.default.findOne.mockResolvedValue({ id: 'existing' });
            await (0, globals_1.expect)(user_service_1.default.createUserProfile(profileData)).rejects.toThrow(errorHandler_1.AppError);
            await (0, globals_1.expect)(user_service_1.default.createUserProfile(profileData)).rejects.toThrow('User profile already exists');
        });
    });
    (0, globals_1.describe)('updateUserProfile', () => {
        (0, globals_1.it)('should update profile successfully', async () => {
            const updates = {
                firstName: 'Jane',
                lastName: 'Smith',
            };
            const mockProfile = {
                id: 'profile-123',
                userId: 'user-123',
                firstName: 'John',
                lastName: 'Doe',
                update: globals_1.jest.fn().mockResolvedValue(true),
            };
            UserProfile_1.default.findOne.mockResolvedValue(mockProfile);
            const result = await user_service_1.default.updateUserProfile('user-123', updates);
            (0, globals_1.expect)(mockProfile.update).toHaveBeenCalledWith(updates);
            (0, globals_1.expect)(result).toBe(mockProfile);
        });
        (0, globals_1.it)('should throw error if profile not found', async () => {
            UserProfile_1.default.findOne.mockResolvedValue(null);
            await (0, globals_1.expect)(user_service_1.default.updateUserProfile('user-123', { firstName: 'Jane' })).rejects.toThrow(errorHandler_1.AppError);
        });
    });
    (0, globals_1.describe)('deleteUserProfile', () => {
        (0, globals_1.it)('should soft delete profile successfully', async () => {
            const mockProfile = {
                id: 'profile-123',
                userId: 'user-123',
                destroy: globals_1.jest.fn().mockResolvedValue(true),
            };
            UserProfile_1.default.findOne.mockResolvedValue(mockProfile);
            await user_service_1.default.deleteUserProfile('user-123');
            (0, globals_1.expect)(mockProfile.destroy).toHaveBeenCalled();
        });
        (0, globals_1.it)('should throw error if profile not found', async () => {
            UserProfile_1.default.findOne.mockResolvedValue(null);
            await (0, globals_1.expect)(user_service_1.default.deleteUserProfile('user-123')).rejects.toThrow(errorHandler_1.AppError);
        });
    });
    (0, globals_1.describe)('hardDeleteUserProfile', () => {
        (0, globals_1.it)('should permanently delete profile', async () => {
            const mockProfile = {
                id: 'profile-123',
                userId: 'user-123',
                destroy: globals_1.jest.fn().mockResolvedValue(true),
            };
            UserProfile_1.default.findOne.mockResolvedValue(mockProfile);
            await user_service_1.default.hardDeleteUserProfile('user-123');
            (0, globals_1.expect)(mockProfile.destroy).toHaveBeenCalledWith({ force: true });
        });
        (0, globals_1.it)('should throw error if profile not found', async () => {
            UserProfile_1.default.findOne.mockResolvedValue(null);
            await (0, globals_1.expect)(user_service_1.default.hardDeleteUserProfile('user-123')).rejects.toThrow(errorHandler_1.AppError);
        });
    });
    (0, globals_1.describe)('updateProfilePicture', () => {
        (0, globals_1.it)('should update profile picture URL', async () => {
            const pictureUrl = 'https://example.com/picture.jpg';
            const mockProfile = {
                id: 'profile-123',
                userId: 'user-123',
                update: globals_1.jest.fn().mockResolvedValue(true),
            };
            UserProfile_1.default.findOne.mockResolvedValue(mockProfile);
            await user_service_1.default.updateProfilePicture('user-123', pictureUrl);
            (0, globals_1.expect)(mockProfile.update).toHaveBeenCalledWith({
                profilePictureUrl: pictureUrl,
            });
        });
    });
    (0, globals_1.describe)('updateNotificationPreferences', () => {
        (0, globals_1.it)('should merge and update notification preferences', async () => {
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
                update: globals_1.jest.fn().mockResolvedValue(true),
            };
            UserProfile_1.default.findOne.mockResolvedValue(mockProfile);
            await user_service_1.default.updateNotificationPreferences('user-123', newPreferences);
            (0, globals_1.expect)(mockProfile.update).toHaveBeenCalledWith({
                notificationPreferences: {
                    ...existingPreferences,
                    ...newPreferences,
                },
            });
        });
    });
    (0, globals_1.describe)('getUserAge', () => {
        (0, globals_1.it)('should calculate age correctly', async () => {
            const mockProfile = {
                id: 'profile-123',
                userId: 'user-123',
                getAge: globals_1.jest.fn().mockReturnValue(30),
            };
            UserProfile_1.default.findOne.mockResolvedValue(mockProfile);
            const age = await user_service_1.default.getUserAge('user-123');
            (0, globals_1.expect)(age).toBe(30);
            (0, globals_1.expect)(mockProfile.getAge).toHaveBeenCalled();
        });
        (0, globals_1.it)('should return null if date of birth not set', async () => {
            const mockProfile = {
                id: 'profile-123',
                userId: 'user-123',
                getAge: globals_1.jest.fn().mockReturnValue(null),
            };
            UserProfile_1.default.findOne.mockResolvedValue(mockProfile);
            const age = await user_service_1.default.getUserAge('user-123');
            (0, globals_1.expect)(age).toBeNull();
        });
    });
    (0, globals_1.describe)('searchUsersByName', () => {
        (0, globals_1.it)('should search users by first and last name', async () => {
            const mockProfiles = [
                { id: '1', firstName: 'John', lastName: 'Doe' },
                { id: '2', firstName: 'Jane', lastName: 'Doe' },
            ];
            UserProfile_1.default.findAll.mockResolvedValue(mockProfiles);
            const result = await user_service_1.default.searchUsersByName('Doe', 20);
            (0, globals_1.expect)(result).toEqual(mockProfiles);
            (0, globals_1.expect)(UserProfile_1.default.findAll).toHaveBeenCalled();
        });
        (0, globals_1.it)('should limit results based on limit parameter', async () => {
            UserProfile_1.default.findAll.mockResolvedValue([]);
            await user_service_1.default.searchUsersByName('test', 10);
            (0, globals_1.expect)(UserProfile_1.default.findAll).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                limit: 10,
            }));
        });
    });
    (0, globals_1.describe)('getRecentProfiles', () => {
        (0, globals_1.it)('should return recent profiles', async () => {
            const mockProfiles = [
                { id: '1', createdAt: new Date('2023-01-02') },
                { id: '2', createdAt: new Date('2023-01-01') },
            ];
            UserProfile_1.default.findAll.mockResolvedValue(mockProfiles);
            const result = await user_service_1.default.getRecentProfiles(20);
            (0, globals_1.expect)(result).toEqual(mockProfiles);
            (0, globals_1.expect)(UserProfile_1.default.findAll).toHaveBeenCalledWith({
                limit: 20,
                order: [['createdAt', 'DESC']],
            });
        });
    });
});
//# sourceMappingURL=user.service.test.js.map