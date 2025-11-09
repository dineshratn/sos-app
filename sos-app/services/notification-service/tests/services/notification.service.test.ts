import { dispatchEmergencyAlert, getBatchStatus, updateBatchStats } from '../../src/services/notification.service';
import { Emergency, EmergencyContact, NotificationPriority } from '../../src/models/Notification';
import { NotificationBatchModel } from '../../src/db/schemas/notification.schema';
import * as notificationQueue from '../../src/queues/notification.queue';

// Mock dependencies
jest.mock('../../src/queues/notification.queue');
jest.mock('../../src/db/schemas/notification.schema');

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('dispatchEmergencyAlert', () => {
    it('should dispatch notifications to all emergency contacts', async () => {
      // Arrange
      const emergency: Emergency = {
        id: 'emg_123',
        userId: 'user_456',
        userName: 'John Doe',
        emergencyType: 'MEDICAL',
        status: 'ACTIVE',
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          address: '123 Main St, San Francisco, CA',
        },
        contacts: [],
        createdAt: new Date(),
      };

      const contacts: EmergencyContact[] = [
        {
          id: 'contact_1',
          name: 'Jane Doe',
          phoneNumber: '+1234567890',
          email: 'jane@example.com',
          priority: 'PRIMARY',
          fcmToken: 'fcm_token_123',
        },
        {
          id: 'contact_2',
          name: 'Bob Smith',
          phoneNumber: '+0987654321',
          email: 'bob@example.com',
          priority: 'SECONDARY',
        },
      ];

      const mockBatch = {
        batchId: 'batch_123',
        emergencyId: emergency.id,
        totalCount: 5,
        sentCount: 0,
        deliveredCount: 0,
        failedCount: 0,
        pendingCount: 5,
        createdAt: new Date(),
      };

      (NotificationBatchModel.create as jest.Mock).mockResolvedValue(mockBatch);
      (notificationQueue.addBulkNotificationJobs as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await dispatchEmergencyAlert(emergency, contacts);

      // Assert
      expect(result.emergencyId).toBe(emergency.id);
      expect(result.totalCount).toBeGreaterThan(0);
      expect(notificationQueue.addBulkNotificationJobs).toHaveBeenCalled();

      const jobs = (notificationQueue.addBulkNotificationJobs as jest.Mock).mock.calls[0][0];
      expect(jobs.length).toBeGreaterThan(0);

      // Verify push, SMS, and email jobs were created
      const channels = jobs.map((job: any) => job.channel);
      expect(channels).toContain('PUSH');
      expect(channels).toContain('SMS');
      expect(channels).toContain('EMAIL');
    });

    it('should set correct priority for primary contacts', async () => {
      const emergency: Emergency = {
        id: 'emg_123',
        userId: 'user_456',
        userName: 'John Doe',
        emergencyType: 'MEDICAL',
        status: 'ACTIVE',
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
        contacts: [],
        createdAt: new Date(),
      };

      const contacts: EmergencyContact[] = [
        {
          id: 'contact_1',
          name: 'Jane Doe',
          phoneNumber: '+1234567890',
          priority: 'PRIMARY',
        },
      ];

      const mockBatch = {
        batchId: 'batch_123',
        emergencyId: emergency.id,
        totalCount: 1,
        createdAt: new Date(),
      };

      (NotificationBatchModel.create as jest.Mock).mockResolvedValue(mockBatch);
      (notificationQueue.addBulkNotificationJobs as jest.Mock).mockResolvedValue([]);

      await dispatchEmergencyAlert(emergency, contacts);

      const jobs = (notificationQueue.addBulkNotificationJobs as jest.Mock).mock.calls[0][0];
      expect(jobs[0].priority).toBe(NotificationPriority.EMERGENCY);
    });

    it('should handle empty contacts list', async () => {
      const emergency: Emergency = {
        id: 'emg_123',
        userId: 'user_456',
        userName: 'John Doe',
        emergencyType: 'MEDICAL',
        status: 'ACTIVE',
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
        contacts: [],
        createdAt: new Date(),
      };

      const mockBatch = {
        batchId: 'batch_123',
        emergencyId: emergency.id,
        totalCount: 0,
        createdAt: new Date(),
      };

      (NotificationBatchModel.create as jest.Mock).mockResolvedValue(mockBatch);
      (notificationQueue.addBulkNotificationJobs as jest.Mock).mockResolvedValue([]);

      const result = await dispatchEmergencyAlert(emergency, []);

      expect(result.totalCount).toBe(0);
    });
  });

  describe('getBatchStatus', () => {
    it('should return batch status', async () => {
      const mockBatch = {
        batchId: 'batch_123',
        emergencyId: 'emg_123',
        totalCount: 5,
        sentCount: 3,
        deliveredCount: 2,
        failedCount: 1,
        pendingCount: 1,
        createdAt: new Date(),
      };

      (NotificationBatchModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockBatch),
      });

      const result = await getBatchStatus('batch_123');

      expect(result).not.toBeNull();
      expect(result?.batchId).toBe('batch_123');
      expect(result?.sentCount).toBe(3);
    });

    it('should return null for non-existent batch', async () => {
      (NotificationBatchModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await getBatchStatus('non_existent');

      expect(result).toBeNull();
    });
  });

  describe('updateBatchStats', () => {
    it('should update batch statistics', async () => {
      (NotificationBatchModel.updateOne as jest.Mock).mockResolvedValue({});

      await updateBatchStats('batch_123', {
        sentCount: 1,
        pendingCount: -1,
      });

      expect(NotificationBatchModel.updateOne).toHaveBeenCalledWith(
        { batchId: 'batch_123' },
        expect.objectContaining({
          $inc: {
            sentCount: 1,
            pendingCount: -1,
          },
        })
      );
    });
  });
});
