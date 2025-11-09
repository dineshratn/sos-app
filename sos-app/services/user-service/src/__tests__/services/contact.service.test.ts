// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import contactService from '../../services/contact.service';
import EmergencyContact, { ContactPriority, ContactRelationship } from '../../models/EmergencyContact';
import { AppError } from '../../middleware/errorHandler';
import * as contactValidation from '../../utils/contactValidation';

// Mock the EmergencyContact model
jest.mock('../../models/EmergencyContact');
jest.mock('../../utils/contactValidation');

describe('EmergencyContactService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserContacts', () => {
    it('should return all contacts for a user', async () => {
      const mockContacts = [
        {
          id: 'contact-1',
          userId: 'user-123',
          name: 'John Doe',
          priority: ContactPriority.PRIMARY,
        },
        {
          id: 'contact-2',
          userId: 'user-123',
          name: 'Jane Doe',
          priority: ContactPriority.SECONDARY,
        },
      ];

      (EmergencyContact.findAll as jest.Mock).mockResolvedValue(mockContacts);

      const result = await contactService.getUserContacts('user-123');

      expect(result).toEqual(mockContacts);
      expect(EmergencyContact.findAll).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: [
          ['priority', 'ASC'],
          ['createdAt', 'DESC'],
        ],
      });
    });

    it('should filter by priority when specified', async () => {
      const mockContacts = [
        {
          id: 'contact-1',
          userId: 'user-123',
          priority: ContactPriority.PRIMARY,
        },
      ];

      (EmergencyContact.findAll as jest.Mock).mockResolvedValue(mockContacts);

      await contactService.getUserContacts('user-123', {
        priority: ContactPriority.PRIMARY,
      });

      expect(EmergencyContact.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            priority: ContactPriority.PRIMARY,
          }),
        })
      );
    });

    it('should filter unverified contacts when specified', async () => {
      (EmergencyContact.findAll as jest.Mock).mockResolvedValue([]);

      await contactService.getUserContacts('user-123', {
        includeUnverified: false,
      });

      expect(EmergencyContact.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            isVerified: true,
          }),
        })
      );
    });
  });

  describe('getContactById', () => {
    it('should return contact when found', async () => {
      const mockContact = {
        id: 'contact-123',
        userId: 'user-123',
        name: 'John Doe',
      };

      (EmergencyContact.findOne as jest.Mock).mockResolvedValue(mockContact);

      const result = await contactService.getContactById('user-123', 'contact-123');

      expect(result).toEqual(mockContact);
      expect(EmergencyContact.findOne).toHaveBeenCalledWith({
        where: {
          id: 'contact-123',
          userId: 'user-123',
        },
      });
    });

    it('should throw error when contact not found', async () => {
      (EmergencyContact.findOne as jest.Mock).mockResolvedValue(null);

      await expect(contactService.getContactById('user-123', 'contact-123')).rejects.toThrow(
        AppError
      );
      await expect(contactService.getContactById('user-123', 'contact-123')).rejects.toThrow(
        'Emergency contact not found'
      );
    });
  });

  describe('createContact', () => {
    it('should create contact with valid data', async () => {
      const contactData = {
        name: 'John Doe',
        phoneNumber: '+1234567890',
        email: 'john@example.com',
        relationship: ContactRelationship.FRIEND,
        priority: ContactPriority.PRIMARY,
      };

      const mockCreatedContact = {
        id: 'contact-123',
        ...contactData,
      };

      (contactValidation.validateContactInfo as jest.Mock).mockReturnValue({
        isValid: true,
        formattedPhone: '+1234567890',
        sanitizedEmail: 'john@example.com',
        errors: [],
      });

      (EmergencyContact.count as jest.Mock).mockResolvedValue(5);
      (EmergencyContact.create as jest.Mock).mockResolvedValue(mockCreatedContact);

      const result = await contactService.createContact('user-123', 'profile-123', contactData);

      expect(result).toEqual(mockCreatedContact);
      expect(EmergencyContact.create).toHaveBeenCalledWith({
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

    it('should throw error when validation fails', async () => {
      const contactData = {
        name: 'John Doe',
        phoneNumber: 'invalid',
        relationship: ContactRelationship.FRIEND,
        priority: ContactPriority.PRIMARY,
      };

      (contactValidation.validateContactInfo as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Invalid phone number format'],
      });

      await expect(
        contactService.createContact('user-123', 'profile-123', contactData)
      ).rejects.toThrow(AppError);
      await expect(
        contactService.createContact('user-123', 'profile-123', contactData)
      ).rejects.toThrow('Invalid contact information');
    });

    it('should throw error when contact limit reached', async () => {
      const contactData = {
        name: 'John Doe',
        phoneNumber: '+1234567890',
        relationship: ContactRelationship.FRIEND,
        priority: ContactPriority.PRIMARY,
      };

      (contactValidation.validateContactInfo as jest.Mock).mockReturnValue({
        isValid: true,
        formattedPhone: '+1234567890',
        errors: [],
      });

      (EmergencyContact.count as jest.Mock).mockResolvedValue(10);

      await expect(
        contactService.createContact('user-123', 'profile-123', contactData)
      ).rejects.toThrow(AppError);
      await expect(
        contactService.createContact('user-123', 'profile-123', contactData)
      ).rejects.toThrow('Maximum number of emergency contacts (10) reached');
    });
  });

  describe('updateContact', () => {
    it('should update contact successfully', async () => {
      const updates = {
        name: 'Jane Doe',
        phoneNumber: '+0987654321',
      };

      const mockContact = {
        id: 'contact-123',
        userId: 'user-123',
        email: 'existing@example.com',
        update: jest.fn().mockResolvedValue(true),
      };

      (EmergencyContact.findOne as jest.Mock).mockResolvedValue(mockContact);
      (contactValidation.validateContactInfo as jest.Mock).mockReturnValue({
        isValid: true,
        formattedPhone: '+0987654321',
        errors: [],
      });

      const result = await contactService.updateContact('user-123', 'contact-123', updates);

      expect(mockContact.update).toHaveBeenCalledWith({
        name: updates.name,
        phoneNumber: '+0987654321',
      });
      expect(result).toBe(mockContact);
    });

    it('should throw error if phone validation fails', async () => {
      const updates = {
        phoneNumber: 'invalid',
      };

      const mockContact = {
        id: 'contact-123',
        userId: 'user-123',
        email: 'existing@example.com',
      };

      (EmergencyContact.findOne as jest.Mock).mockResolvedValue(mockContact);
      (contactValidation.validateContactInfo as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Invalid phone number'],
      });

      await expect(
        contactService.updateContact('user-123', 'contact-123', updates)
      ).rejects.toThrow(AppError);
    });
  });

  describe('deleteContact', () => {
    it('should soft delete contact', async () => {
      const mockContact = {
        id: 'contact-123',
        userId: 'user-123',
        destroy: jest.fn().mockResolvedValue(true),
      };

      (EmergencyContact.findOne as jest.Mock).mockResolvedValue(mockContact);

      await contactService.deleteContact('user-123', 'contact-123');

      expect(mockContact.destroy).toHaveBeenCalled();
    });

    it('should throw error if contact not found', async () => {
      (EmergencyContact.findOne as jest.Mock).mockResolvedValue(null);

      await expect(contactService.deleteContact('user-123', 'contact-123')).rejects.toThrow(
        AppError
      );
    });
  });

  describe('verifyContact', () => {
    it('should mark contact as verified', async () => {
      const mockContact = {
        id: 'contact-123',
        userId: 'user-123',
        update: jest.fn().mockResolvedValue(true),
      };

      (EmergencyContact.findOne as jest.Mock).mockResolvedValue(mockContact);

      await contactService.verifyContact('user-123', 'contact-123');

      expect(mockContact.update).toHaveBeenCalledWith({
        isVerified: true,
      });
    });
  });

  describe('getPrimaryContacts', () => {
    it('should return only primary verified contacts', async () => {
      const mockContacts = [
        {
          id: 'contact-1',
          priority: ContactPriority.PRIMARY,
          isVerified: true,
        },
      ];

      (EmergencyContact.findAll as jest.Mock).mockResolvedValue(mockContacts);

      const result = await contactService.getPrimaryContacts('user-123');

      expect(result).toEqual(mockContacts);
    });
  });

  describe('updateLastNotified', () => {
    it('should update last notified timestamp', async () => {
      const mockContact = {
        id: 'contact-123',
        update: jest.fn().mockResolvedValue(true),
      };

      (EmergencyContact.findByPk as jest.Mock).mockResolvedValue(mockContact);

      await contactService.updateLastNotified('contact-123');

      expect(mockContact.update).toHaveBeenCalledWith({
        lastNotifiedAt: expect.any(Date),
      });
    });

    it('should throw error if contact not found', async () => {
      (EmergencyContact.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(contactService.updateLastNotified('contact-123')).rejects.toThrow(AppError);
    });
  });

  describe('getContactsByPriority', () => {
    it('should return contacts filtered by priority', async () => {
      const mockContacts = [
        {
          id: 'contact-1',
          priority: ContactPriority.SECONDARY,
        },
      ];

      (EmergencyContact.findAll as jest.Mock).mockResolvedValue(mockContacts);

      const result = await contactService.getContactsByPriority(
        'user-123',
        ContactPriority.SECONDARY
      );

      expect(result).toEqual(mockContacts);
    });
  });

  describe('getVerifiedContacts', () => {
    it('should return only verified contacts', async () => {
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

      (EmergencyContact.findAll as jest.Mock).mockResolvedValue(mockContacts);

      const result = await contactService.getVerifiedContacts('user-123');

      expect(result).toEqual(mockContacts);
      expect(EmergencyContact.findAll).toHaveBeenCalledWith({
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

  describe('countUserContacts', () => {
    it('should return contact count', async () => {
      (EmergencyContact.count as jest.Mock).mockResolvedValue(7);

      const result = await contactService.countUserContacts('user-123');

      expect(result).toBe(7);
      expect(EmergencyContact.count).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });
  });

  describe('hasPrimaryContact', () => {
    it('should return true when user has primary contact', async () => {
      (EmergencyContact.count as jest.Mock).mockResolvedValue(2);

      const result = await contactService.hasPrimaryContact('user-123');

      expect(result).toBe(true);
    });

    it('should return false when user has no primary contact', async () => {
      (EmergencyContact.count as jest.Mock).mockResolvedValue(0);

      const result = await contactService.hasPrimaryContact('user-123');

      expect(result).toBe(false);
    });
  });

  describe('getContactStats', () => {
    it('should return contact statistics', async () => {
      (EmergencyContact.count as jest.Mock)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(7) // verified
        .mockResolvedValueOnce(3) // primary
        .mockResolvedValueOnce(4) // secondary
        .mockResolvedValueOnce(3); // tertiary

      const result = await contactService.getContactStats('user-123');

      expect(result).toEqual({
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
