"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const EmergencyContact_1 = __importDefault(require("../models/EmergencyContact"));
const UserProfile_1 = __importDefault(require("../models/UserProfile"));
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = __importDefault(require("../utils/logger"));
const phoneValidator_1 = require("../utils/phoneValidator");
const config_1 = __importDefault(require("../config"));
class EmergencyContactService {
    /**
     * Get all emergency contacts for a user
     */
    async getContacts(userId) {
        try {
            // Get user profile
            const profile = await UserProfile_1.default.findOne({ where: { userId } });
            if (!profile) {
                // Return empty array if no profile exists
                return [];
            }
            // Get all contacts ordered by priority
            const contacts = await EmergencyContact_1.default.findAll({
                where: { userProfileId: profile.id },
                order: [
                    ['isPrimary', 'DESC'],
                    ['priority', 'ASC'],
                    ['createdAt', 'ASC'],
                ],
            });
            return contacts;
        }
        catch (error) {
            logger_1.default.error(`Error getting contacts for user ${userId}:`, error);
            throw new errorHandler_1.AppError('Failed to get emergency contacts', 500, 'CONTACTS_GET_ERROR');
        }
    }
    /**
     * Get specific emergency contact by ID
     */
    async getContactById(contactId, userId) {
        try {
            // Get user profile
            const profile = await UserProfile_1.default.findOne({ where: { userId } });
            if (!profile) {
                throw new errorHandler_1.AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
            }
            // Get contact
            const contact = await EmergencyContact_1.default.findOne({
                where: {
                    id: contactId,
                    userProfileId: profile.id,
                },
            });
            if (!contact) {
                throw new errorHandler_1.AppError('Emergency contact not found', 404, 'CONTACT_NOT_FOUND');
            }
            return contact;
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            logger_1.default.error(`Error getting contact ${contactId}:`, error);
            throw new errorHandler_1.AppError('Failed to get emergency contact', 500, 'CONTACT_GET_ERROR');
        }
    }
    /**
     * Create new emergency contact
     */
    async createContact(userId, data) {
        try {
            // Get or create user profile
            let profile = await UserProfile_1.default.findOne({ where: { userId } });
            if (!profile) {
                profile = await UserProfile_1.default.create({
                    userId,
                    isActive: true,
                });
            }
            // Check contact limit
            const contactCount = await EmergencyContact_1.default.count({
                where: { userProfileId: profile.id },
            });
            if (contactCount >= config_1.default.emergencyContacts.maxContacts) {
                throw new errorHandler_1.AppError(`Maximum ${config_1.default.emergencyContacts.maxContacts} emergency contacts allowed`, 400, 'MAX_CONTACTS_REACHED');
            }
            // Validate phone number
            const phoneValidation = (0, phoneValidator_1.validatePhoneNumber)(data.phoneNumber);
            if (!phoneValidation.isValid) {
                throw new errorHandler_1.AppError(phoneValidation.message || 'Invalid phone number', 400, 'INVALID_PHONE_NUMBER');
            }
            data.phoneNumber = phoneValidation.formatted;
            // Validate alternate phone number if provided
            if (data.alternatePhoneNumber) {
                const altPhoneValidation = (0, phoneValidator_1.validatePhoneNumber)(data.alternatePhoneNumber);
                if (!altPhoneValidation.isValid) {
                    throw new errorHandler_1.AppError('Invalid alternate phone number', 400, 'INVALID_ALTERNATE_PHONE');
                }
                data.alternatePhoneNumber = altPhoneValidation.formatted;
            }
            // If setting as primary, unset current primary
            if (data.isPrimary) {
                await EmergencyContact_1.default.update({ isPrimary: false }, {
                    where: {
                        userProfileId: profile.id,
                        isPrimary: true,
                    },
                });
            }
            // Create contact
            const contact = await EmergencyContact_1.default.create({
                userProfileId: profile.id,
                ...data,
                isActive: true,
            });
            logger_1.default.info(`Emergency contact created for user ${userId}`);
            return contact;
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            logger_1.default.error(`Error creating contact for user ${userId}:`, error);
            throw new errorHandler_1.AppError('Failed to create emergency contact', 500, 'CONTACT_CREATE_ERROR');
        }
    }
    /**
     * Update emergency contact
     */
    async updateContact(contactId, userId, data) {
        try {
            // Get user profile
            const profile = await UserProfile_1.default.findOne({ where: { userId } });
            if (!profile) {
                throw new errorHandler_1.AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
            }
            // Get contact
            const contact = await EmergencyContact_1.default.findOne({
                where: {
                    id: contactId,
                    userProfileId: profile.id,
                },
            });
            if (!contact) {
                throw new errorHandler_1.AppError('Emergency contact not found', 404, 'CONTACT_NOT_FOUND');
            }
            // Validate phone number if provided
            if (data.phoneNumber) {
                const phoneValidation = (0, phoneValidator_1.validatePhoneNumber)(data.phoneNumber);
                if (!phoneValidation.isValid) {
                    throw new errorHandler_1.AppError(phoneValidation.message || 'Invalid phone number', 400, 'INVALID_PHONE_NUMBER');
                }
                data.phoneNumber = phoneValidation.formatted;
            }
            // Validate alternate phone number if provided
            if (data.alternatePhoneNumber) {
                const altPhoneValidation = (0, phoneValidator_1.validatePhoneNumber)(data.alternatePhoneNumber);
                if (!altPhoneValidation.isValid) {
                    throw new errorHandler_1.AppError('Invalid alternate phone number', 400, 'INVALID_ALTERNATE_PHONE');
                }
                data.alternatePhoneNumber = altPhoneValidation.formatted;
            }
            // If setting as primary, unset current primary
            if (data.isPrimary && !contact.isPrimary) {
                await EmergencyContact_1.default.update({ isPrimary: false }, {
                    where: {
                        userProfileId: profile.id,
                        isPrimary: true,
                    },
                });
            }
            // Update contact
            await contact.update(data);
            logger_1.default.info(`Emergency contact ${contactId} updated for user ${userId}`);
            return contact;
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            logger_1.default.error(`Error updating contact ${contactId}:`, error);
            throw new errorHandler_1.AppError('Failed to update emergency contact', 500, 'CONTACT_UPDATE_ERROR');
        }
    }
    /**
     * Delete emergency contact (soft delete)
     */
    async deleteContact(contactId, userId) {
        try {
            // Get user profile
            const profile = await UserProfile_1.default.findOne({ where: { userId } });
            if (!profile) {
                throw new errorHandler_1.AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
            }
            // Get contact
            const contact = await EmergencyContact_1.default.findOne({
                where: {
                    id: contactId,
                    userProfileId: profile.id,
                },
            });
            if (!contact) {
                throw new errorHandler_1.AppError('Emergency contact not found', 404, 'CONTACT_NOT_FOUND');
            }
            // Soft delete
            await contact.destroy();
            logger_1.default.info(`Emergency contact ${contactId} deleted for user ${userId}`);
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            logger_1.default.error(`Error deleting contact ${contactId}:`, error);
            throw new errorHandler_1.AppError('Failed to delete emergency contact', 500, 'CONTACT_DELETE_ERROR');
        }
    }
    /**
     * Set contact as primary
     */
    async setPrimaryContact(contactId, userId) {
        try {
            return await this.updateContact(contactId, userId, { isPrimary: true });
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Get primary contact
     */
    async getPrimaryContact(userId) {
        try {
            const profile = await UserProfile_1.default.findOne({ where: { userId } });
            if (!profile) {
                return null;
            }
            const contact = await EmergencyContact_1.default.findOne({
                where: {
                    userProfileId: profile.id,
                    isPrimary: true,
                },
            });
            return contact;
        }
        catch (error) {
            logger_1.default.error(`Error getting primary contact for user ${userId}:`, error);
            return null;
        }
    }
    /**
     * Get contact count for user
     */
    async getContactCount(userId) {
        try {
            const profile = await UserProfile_1.default.findOne({ where: { userId } });
            if (!profile) {
                return 0;
            }
            return await EmergencyContact_1.default.count({
                where: { userProfileId: profile.id },
            });
        }
        catch (error) {
            logger_1.default.error(`Error getting contact count for user ${userId}:`, error);
            return 0;
        }
    }
}
exports.default = new EmergencyContactService();
//# sourceMappingURL=emergencyContact.service.js.map