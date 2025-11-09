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
// @ts-nocheck
const globals_1 = require("@jest/globals");
const contact_service_1 = __importDefault(require("../../services/contact.service"));
const EmergencyContact_1 = __importStar(require("../../models/EmergencyContact"));
const errorHandler_1 = require("../../middleware/errorHandler");
const contactValidation = __importStar(require("../../utils/contactValidation"));
// Mock the EmergencyContact model
globals_1.jest.mock('../../models/EmergencyContact');
globals_1.jest.mock('../../utils/contactValidation');
(0, globals_1.describe)('EmergencyContactService', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('getUserContacts', () => {
        (0, globals_1.it)('should return all contacts for a user', async () => {
            const mockContacts = [
                {
                    id: 'contact-1',
                    userId: 'user-123',
                    name: 'John Doe',
                    priority: EmergencyContact_1.ContactPriority.PRIMARY,
                },
                {
                    id: 'contact-2',
                    userId: 'user-123',
                    name: 'Jane Doe',
                    priority: EmergencyContact_1.ContactPriority.SECONDARY,
                },
            ];
            EmergencyContact_1.default.findAll.mockResolvedValue(mockContacts);
            const result = await contact_service_1.default.getUserContacts('user-123');
            (0, globals_1.expect)(result).toEqual(mockContacts);
            (0, globals_1.expect)(EmergencyContact_1.default.findAll).toHaveBeenCalledWith({
                where: { userId: 'user-123' },
                order: [
                    ['priority', 'ASC'],
                    ['createdAt', 'DESC'],
                ],
            });
        });
        (0, globals_1.it)('should filter by priority when specified', async () => {
            const mockContacts = [
                {
                    id: 'contact-1',
                    userId: 'user-123',
                    priority: EmergencyContact_1.ContactPriority.PRIMARY,
                },
            ];
            EmergencyContact_1.default.findAll.mockResolvedValue(mockContacts);
            await contact_service_1.default.getUserContacts('user-123', {
                priority: EmergencyContact_1.ContactPriority.PRIMARY,
            });
            (0, globals_1.expect)(EmergencyContact_1.default.findAll).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                where: globals_1.expect.objectContaining({
                    userId: 'user-123',
                    priority: EmergencyContact_1.ContactPriority.PRIMARY,
                }),
            }));
        });
        (0, globals_1.it)('should filter unverified contacts when specified', async () => {
            EmergencyContact_1.default.findAll.mockResolvedValue([]);
            await contact_service_1.default.getUserContacts('user-123', {
                includeUnverified: false,
            });
            (0, globals_1.expect)(EmergencyContact_1.default.findAll).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                where: globals_1.expect.objectContaining({
                    userId: 'user-123',
                    isVerified: true,
                }),
            }));
        });
    });
    (0, globals_1.describe)('getContactById', () => {
        (0, globals_1.it)('should return contact when found', async () => {
            const mockContact = {
                id: 'contact-123',
                userId: 'user-123',
                name: 'John Doe',
            };
            EmergencyContact_1.default.findOne.mockResolvedValue(mockContact);
            const result = await contact_service_1.default.getContactById('user-123', 'contact-123');
            (0, globals_1.expect)(result).toEqual(mockContact);
            (0, globals_1.expect)(EmergencyContact_1.default.findOne).toHaveBeenCalledWith({
                where: {
                    id: 'contact-123',
                    userId: 'user-123',
                },
            });
        });
        (0, globals_1.it)('should throw error when contact not found', async () => {
            EmergencyContact_1.default.findOne.mockResolvedValue(null);
            await (0, globals_1.expect)(contact_service_1.default.getContactById('user-123', 'contact-123')).rejects.toThrow(errorHandler_1.AppError);
            await (0, globals_1.expect)(contact_service_1.default.getContactById('user-123', 'contact-123')).rejects.toThrow('Emergency contact not found');
        });
    });
    (0, globals_1.describe)('createContact', () => {
        (0, globals_1.it)('should create contact with valid data', async () => {
            const contactData = {
                name: 'John Doe',
                phoneNumber: '+1234567890',
                email: 'john@example.com',
                relationship: EmergencyContact_1.ContactRelationship.FRIEND,
                priority: EmergencyContact_1.ContactPriority.PRIMARY,
            };
            const mockCreatedContact = {
                id: 'contact-123',
                ...contactData,
            };
            contactValidation.validateContactInfo.mockReturnValue({
                isValid: true,
                formattedPhone: '+1234567890',
                sanitizedEmail: 'john@example.com',
                errors: [],
            });
            EmergencyContact_1.default.count.mockResolvedValue(5);
            EmergencyContact_1.default.create.mockResolvedValue(mockCreatedContact);
            const result = await contact_service_1.default.createContact('user-123', 'profile-123', contactData);
            (0, globals_1.expect)(result).toEqual(mockCreatedContact);
            (0, globals_1.expect)(EmergencyContact_1.default.create).toHaveBeenCalledWith({
                userId: 'user-123',
                userProfileId: 'profile-123',
                name: contactData.name,
                phoneNumber: '+1234567890',
                email: 'john@example.com',
                relationship: contactData.relationship,
                priority: contactData.priority,
                address: undefined,
                notes: undefined,
            });
        });
        (0, globals_1.it)('should throw error when validation fails', async () => {
            const contactData = {
                name: 'John Doe',
                phoneNumber: 'invalid',
                relationship: EmergencyContact_1.ContactRelationship.FRIEND,
                priority: EmergencyContact_1.ContactPriority.PRIMARY,
            };
            contactValidation.validateContactInfo.mockReturnValue({
                isValid: false,
                errors: ['Invalid phone number format'],
            });
            await (0, globals_1.expect)(contact_service_1.default.createContact('user-123', 'profile-123', contactData)).rejects.toThrow(errorHandler_1.AppError);
            await (0, globals_1.expect)(contact_service_1.default.createContact('user-123', 'profile-123', contactData)).rejects.toThrow('Invalid contact information');
        });
        (0, globals_1.it)('should throw error when contact limit reached', async () => {
            const contactData = {
                name: 'John Doe',
                phoneNumber: '+1234567890',
                relationship: EmergencyContact_1.ContactRelationship.FRIEND,
                priority: EmergencyContact_1.ContactPriority.PRIMARY,
            };
            contactValidation.validateContactInfo.mockReturnValue({
                isValid: true,
                formattedPhone: '+1234567890',
                errors: [],
            });
            EmergencyContact_1.default.count.mockResolvedValue(10);
            await (0, globals_1.expect)(contact_service_1.default.createContact('user-123', 'profile-123', contactData)).rejects.toThrow(errorHandler_1.AppError);
            await (0, globals_1.expect)(contact_service_1.default.createContact('user-123', 'profile-123', contactData)).rejects.toThrow('Maximum number of emergency contacts (10) reached');
        });
    });
    (0, globals_1.describe)('updateContact', () => {
        (0, globals_1.it)('should update contact successfully', async () => {
            const updates = {
                name: 'Jane Doe',
                phoneNumber: '+0987654321',
            };
            const mockContact = {
                id: 'contact-123',
                userId: 'user-123',
                email: 'existing@example.com',
                update: globals_1.jest.fn().mockResolvedValue(true),
            };
            EmergencyContact_1.default.findOne.mockResolvedValue(mockContact);
            contactValidation.validateContactInfo.mockReturnValue({
                isValid: true,
                formattedPhone: '+0987654321',
                errors: [],
            });
            const result = await contact_service_1.default.updateContact('user-123', 'contact-123', updates);
            (0, globals_1.expect)(mockContact.update).toHaveBeenCalledWith({
                name: updates.name,
                phoneNumber: '+0987654321',
            });
            (0, globals_1.expect)(result).toBe(mockContact);
        });
        (0, globals_1.it)('should throw error if phone validation fails', async () => {
            const updates = {
                phoneNumber: 'invalid',
            };
            const mockContact = {
                id: 'contact-123',
                userId: 'user-123',
                email: 'existing@example.com',
            };
            EmergencyContact_1.default.findOne.mockResolvedValue(mockContact);
            contactValidation.validateContactInfo.mockReturnValue({
                isValid: false,
                errors: ['Invalid phone number'],
            });
            await (0, globals_1.expect)(contact_service_1.default.updateContact('user-123', 'contact-123', updates)).rejects.toThrow(errorHandler_1.AppError);
        });
    });
    (0, globals_1.describe)('deleteContact', () => {
        (0, globals_1.it)('should soft delete contact', async () => {
            const mockContact = {
                id: 'contact-123',
                userId: 'user-123',
                destroy: globals_1.jest.fn().mockResolvedValue(true),
            };
            EmergencyContact_1.default.findOne.mockResolvedValue(mockContact);
            await contact_service_1.default.deleteContact('user-123', 'contact-123');
            (0, globals_1.expect)(mockContact.destroy).toHaveBeenCalled();
        });
        (0, globals_1.it)('should throw error if contact not found', async () => {
            EmergencyContact_1.default.findOne.mockResolvedValue(null);
            await (0, globals_1.expect)(contact_service_1.default.deleteContact('user-123', 'contact-123')).rejects.toThrow(errorHandler_1.AppError);
        });
    });
    (0, globals_1.describe)('verifyContact', () => {
        (0, globals_1.it)('should mark contact as verified', async () => {
            const mockContact = {
                id: 'contact-123',
                userId: 'user-123',
                update: globals_1.jest.fn().mockResolvedValue(true),
            };
            EmergencyContact_1.default.findOne.mockResolvedValue(mockContact);
            await contact_service_1.default.verifyContact('user-123', 'contact-123');
            (0, globals_1.expect)(mockContact.update).toHaveBeenCalledWith({
                isVerified: true,
            });
        });
    });
    (0, globals_1.describe)('getPrimaryContacts', () => {
        (0, globals_1.it)('should return only primary verified contacts', async () => {
            const mockContacts = [
                {
                    id: 'contact-1',
                    priority: EmergencyContact_1.ContactPriority.PRIMARY,
                    isVerified: true,
                },
            ];
            EmergencyContact_1.default.findAll.mockResolvedValue(mockContacts);
            const result = await contact_service_1.default.getPrimaryContacts('user-123');
            (0, globals_1.expect)(result).toEqual(mockContacts);
        });
    });
    (0, globals_1.describe)('updateLastNotified', () => {
        (0, globals_1.it)('should update last notified timestamp', async () => {
            const mockContact = {
                id: 'contact-123',
                update: globals_1.jest.fn().mockResolvedValue(true),
            };
            EmergencyContact_1.default.findByPk.mockResolvedValue(mockContact);
            await contact_service_1.default.updateLastNotified('contact-123');
            (0, globals_1.expect)(mockContact.update).toHaveBeenCalledWith({
                lastNotifiedAt: globals_1.expect.any(Date),
            });
        });
        (0, globals_1.it)('should throw error if contact not found', async () => {
            EmergencyContact_1.default.findByPk.mockResolvedValue(null);
            await (0, globals_1.expect)(contact_service_1.default.updateLastNotified('contact-123')).rejects.toThrow(errorHandler_1.AppError);
        });
    });
    (0, globals_1.describe)('getContactsByPriority', () => {
        (0, globals_1.it)('should return contacts filtered by priority', async () => {
            const mockContacts = [
                {
                    id: 'contact-1',
                    priority: EmergencyContact_1.ContactPriority.SECONDARY,
                },
            ];
            EmergencyContact_1.default.findAll.mockResolvedValue(mockContacts);
            const result = await contact_service_1.default.getContactsByPriority('user-123', EmergencyContact_1.ContactPriority.SECONDARY);
            (0, globals_1.expect)(result).toEqual(mockContacts);
        });
    });
    (0, globals_1.describe)('getVerifiedContacts', () => {
        (0, globals_1.it)('should return only verified contacts', async () => {
            const mockContacts = [
                {
                    id: 'contact-1',
                    isVerified: true,
                },
                {
                    id: 'contact-2',
                    isVerified: true,
                },
            ];
            EmergencyContact_1.default.findAll.mockResolvedValue(mockContacts);
            const result = await contact_service_1.default.getVerifiedContacts('user-123');
            (0, globals_1.expect)(result).toEqual(mockContacts);
            (0, globals_1.expect)(EmergencyContact_1.default.findAll).toHaveBeenCalledWith({
                where: {
                    userId: 'user-123',
                    isVerified: true,
                },
                order: [
                    ['priority', 'ASC'],
                    ['createdAt', 'DESC'],
                ],
            });
        });
    });
    (0, globals_1.describe)('countUserContacts', () => {
        (0, globals_1.it)('should return contact count', async () => {
            EmergencyContact_1.default.count.mockResolvedValue(7);
            const result = await contact_service_1.default.countUserContacts('user-123');
            (0, globals_1.expect)(result).toBe(7);
            (0, globals_1.expect)(EmergencyContact_1.default.count).toHaveBeenCalledWith({
                where: { userId: 'user-123' },
            });
        });
    });
    (0, globals_1.describe)('hasPrimaryContact', () => {
        (0, globals_1.it)('should return true when user has primary contact', async () => {
            EmergencyContact_1.default.count.mockResolvedValue(2);
            const result = await contact_service_1.default.hasPrimaryContact('user-123');
            (0, globals_1.expect)(result).toBe(true);
        });
        (0, globals_1.it)('should return false when user has no primary contact', async () => {
            EmergencyContact_1.default.count.mockResolvedValue(0);
            const result = await contact_service_1.default.hasPrimaryContact('user-123');
            (0, globals_1.expect)(result).toBe(false);
        });
    });
    (0, globals_1.describe)('getContactStats', () => {
        (0, globals_1.it)('should return contact statistics', async () => {
            EmergencyContact_1.default.count
                .mockResolvedValueOnce(10) // total
                .mockResolvedValueOnce(7) // verified
                .mockResolvedValueOnce(3) // primary
                .mockResolvedValueOnce(4) // secondary
                .mockResolvedValueOnce(3); // tertiary
            const result = await contact_service_1.default.getContactStats('user-123');
            (0, globals_1.expect)(result).toEqual({
                total: 10,
                verified: 7,
                unverified: 3,
                byPriority: {
                    primary: 3,
                    secondary: 4,
                    tertiary: 3,
                },
            });
        });
    });
});
//# sourceMappingURL=contact.service.test.js.map