"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const EmergencyContact_1 = __importStar(require("../models/EmergencyContact"));
const UserProfile_1 = __importDefault(require("../models/UserProfile"));
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = __importDefault(require("../utils/logger"));
const contactValidation_1 = require("../utils/contactValidation");
class EmergencyContactService {
    /**
     * Get all emergency contacts for a user
     */
    async getUserContacts(userId, options) {
        try {
            // Get user profile first
            const profile = await UserProfile_1.default.findOne({ where: { userId } });
            if (!profile) {
                return [];
            }
            const where = { userProfileId: profile.id };
            // Filter by priority if specified
            if (options?.priority) {
                where.priority = options.priority;
            }
            // Filter by verification status
            if (options?.includeUnverified === false) {
                where.isActive = true;
            }
            const contacts = await EmergencyContact_1.default.findAll({
                where,
                order: [
                    ['priority', 'ASC'], // Primary first, then secondary, then tertiary
                    ['createdAt', 'DESC'],
                ],
            });
            return contacts;
        }
        catch (error) {
            logger_1.default.error('Error fetching emergency contacts:', error);
            throw new errorHandler_1.AppError('Failed to fetch emergency contacts', 500, 'FETCH_CONTACTS_ERROR');
        }
    }
    /**
     * Get a single emergency contact by ID
     */
    async getContactById(userId, contactId) {
        try {
            // Get user profile first
            const profile = await UserProfile_1.default.findOne({ where: { userId } });
            if (!profile) {
                throw new errorHandler_1.AppError('User profile not found', 404, 'PROFILE_NOT_FOUND');
            }
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
            logger_1.default.error('Error fetching emergency contact:', error);
            throw new errorHandler_1.AppError('Failed to fetch emergency contact', 500, 'FETCH_CONTACT_ERROR');
        }
    }
    /**
     * Create a new emergency contact
     */
    async createContact(userId, userProfileId, data) {
        try {
            // Validate contact information
            const validation = (0, contactValidation_1.validateContactInfo)(data.phoneNumber, data.email);
            if (!validation.isValid) {
                throw new errorHandler_1.AppError(`Invalid contact information: ${validation.errors.join(', ')}`, 400, 'INVALID_CONTACT_INFO');
            }
            // Check contact limit (max 10 contacts per user)
            const existingContactsCount = await EmergencyContact_1.default.count({
                where: { userProfileId },
            });
            if (existingContactsCount >= 10) {
                throw new errorHandler_1.AppError('Maximum number of emergency contacts (10) reached', 400, 'CONTACT_LIMIT_REACHED');
            }
            // Format phone number and sanitize email
            const formattedPhone = validation.formattedPhone || data.phoneNumber;
            const sanitizedEmail = validation.sanitizedEmail;
            // Create the contact
            const contact = await EmergencyContact_1.default.create({
                userProfileId,
                name: data.name,
                phoneNumber: formattedPhone,
                email: sanitizedEmail,
                relationship: data.relationship,
                priority: data.priority,
                address: data.address,
                notes: data.notes,
            });
            logger_1.default.info(`Created emergency contact: ${contact.id} for user: ${userId}`);
            return contact;
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            logger_1.default.error('Error creating emergency contact:', error);
            throw new errorHandler_1.AppError('Failed to create emergency contact', 500, 'CREATE_CONTACT_ERROR');
        }
    }
    /**
     * Update an emergency contact
     */
    async updateContact(userId, contactId, updates) {
        try {
            const contact = await this.getContactById(userId, contactId);
            // Validate phone number if it's being updated
            if (updates.phoneNumber) {
                const validation = (0, contactValidation_1.validateContactInfo)(updates.phoneNumber, updates.email || contact.email);
                if (!validation.isValid) {
                    throw new errorHandler_1.AppError(`Invalid contact information: ${validation.errors.join(', ')}`, 400, 'INVALID_CONTACT_INFO');
                }
                updates.phoneNumber = validation.formattedPhone || updates.phoneNumber;
            }
            // Sanitize email if it's being updated
            if (updates.email) {
                updates.email = (0, contactValidation_1.sanitizeEmail)(updates.email);
            }
            // Update the contact
            await contact.update(updates);
            logger_1.default.info(`Updated emergency contact: ${contactId} for user: ${userId}`);
            return contact;
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            logger_1.default.error('Error updating emergency contact:', error);
            throw new errorHandler_1.AppError('Failed to update emergency contact', 500, 'UPDATE_CONTACT_ERROR');
        }
    }
    /**
     * Delete an emergency contact (soft delete)
     */
    async deleteContact(userId, contactId) {
        try {
            const contact = await this.getContactById(userId, contactId);
            // Soft delete the contact
            await contact.destroy();
            logger_1.default.info(`Deleted emergency contact: ${contactId} for user: ${userId}`);
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            logger_1.default.error('Error deleting emergency contact:', error);
            throw new errorHandler_1.AppError('Failed to delete emergency contact', 500, 'DELETE_CONTACT_ERROR');
        }
    }
    /**
     * Mark a contact as verified
     */
    async verifyContact(userId, contactId) {
        try {
            const contact = await this.getContactById(userId, contactId);
            await contact.update({
                isActive: true,
            });
            logger_1.default.info(`Verified emergency contact: ${contactId} for user: ${userId}`);
            return contact;
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            logger_1.default.error('Error verifying emergency contact:', error);
            throw new errorHandler_1.AppError('Failed to verify emergency contact', 500, 'VERIFY_CONTACT_ERROR');
        }
    }
    /**
     * Get primary emergency contacts
     */
    async getPrimaryContacts(userId) {
        try {
            return await this.getUserContacts(userId, {
                priority: EmergencyContact_1.ContactPriority.CRITICAL,
                includeUnverified: false,
            });
        }
        catch (error) {
            logger_1.default.error('Error fetching primary contacts:', error);
            throw new errorHandler_1.AppError('Failed to fetch primary contacts', 500, 'FETCH_PRIMARY_CONTACTS_ERROR');
        }
    }
    /**
     * Update last notified timestamp
     * Called when a contact is notified during an emergency
     */
    async updateLastNotified(contactId) {
        try {
            const contact = await EmergencyContact_1.default.findByPk(contactId);
            if (!contact) {
                throw new errorHandler_1.AppError('Emergency contact not found', 404, 'CONTACT_NOT_FOUND');
            }
            // Note: lastNotifiedAt field should be added to EmergencyContact model if needed
            // For now, just log the notification
            logger_1.default.info(`Contact ${contactId} was notified during emergency`);
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            logger_1.default.error('Error updating last notified:', error);
            throw new errorHandler_1.AppError('Failed to update last notified', 500, 'UPDATE_NOTIFIED_ERROR');
        }
    }
    /**
     * Get contacts by priority level
     */
    async getContactsByPriority(userId, priority) {
        try {
            return await this.getUserContacts(userId, {
                priority,
                includeUnverified: false,
            });
        }
        catch (error) {
            logger_1.default.error(`Error fetching ${priority} contacts:`, error);
            throw new errorHandler_1.AppError(`Failed to fetch ${priority} contacts`, 500, 'FETCH_PRIORITY_ERROR');
        }
    }
    /**
     * Get all verified contacts for emergency notification
     */
    async getVerifiedContacts(userId) {
        try {
            // Get user profile first
            const profile = await UserProfile_1.default.findOne({ where: { userId } });
            if (!profile) {
                return [];
            }
            const contacts = await EmergencyContact_1.default.findAll({
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
        }
        catch (error) {
            logger_1.default.error('Error fetching verified contacts:', error);
            throw new errorHandler_1.AppError('Failed to fetch verified contacts', 500, 'FETCH_VERIFIED_ERROR');
        }
    }
    /**
     * Count user's emergency contacts
     */
    async countUserContacts(userId) {
        try {
            // Get user profile first
            const profile = await UserProfile_1.default.findOne({ where: { userId } });
            if (!profile) {
                return 0;
            }
            return await EmergencyContact_1.default.count({
                where: { userProfileId: profile.id },
            });
        }
        catch (error) {
            logger_1.default.error('Error counting contacts:', error);
            throw new errorHandler_1.AppError('Failed to count contacts', 500, 'COUNT_CONTACTS_ERROR');
        }
    }
    /**
     * Check if user has any primary contacts
     */
    async hasPrimaryContact(userId) {
        try {
            // Get user profile first
            const profile = await UserProfile_1.default.findOne({ where: { userId } });
            if (!profile) {
                return false;
            }
            const count = await EmergencyContact_1.default.count({
                where: {
                    userProfileId: profile.id,
                    isPrimary: true,
                },
            });
            return count > 0;
        }
        catch (error) {
            logger_1.default.error('Error checking primary contact:', error);
            return false;
        }
    }
    /**
     * Get contact statistics for a user
     */
    async getContactStats(userId) {
        try {
            // Get user profile first
            const profile = await UserProfile_1.default.findOne({ where: { userId } });
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
                EmergencyContact_1.default.count({ where: { userProfileId: profile.id } }),
                EmergencyContact_1.default.count({ where: { userProfileId: profile.id, isActive: true } }),
                EmergencyContact_1.default.count({ where: { userProfileId: profile.id, priority: EmergencyContact_1.ContactPriority.CRITICAL } }),
                EmergencyContact_1.default.count({ where: { userProfileId: profile.id, priority: EmergencyContact_1.ContactPriority.HIGH } }),
                EmergencyContact_1.default.count({ where: { userProfileId: profile.id, priority: EmergencyContact_1.ContactPriority.MEDIUM } }),
                EmergencyContact_1.default.count({ where: { userProfileId: profile.id, priority: EmergencyContact_1.ContactPriority.LOW } }),
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
        }
        catch (error) {
            logger_1.default.error('Error getting contact stats:', error);
            throw new errorHandler_1.AppError('Failed to get contact statistics', 500, 'GET_STATS_ERROR');
        }
    }
}
exports.default = new EmergencyContactService();
//# sourceMappingURL=contact.service.js.map