import { handleRetry, calculateRetryDelay, shouldRetry, getRetryStrategy } from '../../src/services/retry.service';
import { NotificationJob, NotificationChannel, NotificationPriority } from '../../src/models/Notification';
import * as notificationQueue from '../../src/queues/notification.queue';

jest.mock('../../src/queues/notification.queue');

describe('RetryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleRetry', () => {
    it('should enqueue SMS fallback when push notification fails', async () => {
      const job: NotificationJob = {
        emergencyId: 'emg_123',
        batchId: 'batch_123',
        recipientId: 'contact_1',
        recipientName: 'Jane Doe',
        channel: NotificationChannel.PUSH,
        priority: NotificationPriority.EMERGENCY,
        templateData: {
          userName: 'John Doe',
          emergencyType: 'MEDICAL',
          location: '37.7749, -122.4194',
          emergencyLink: 'https://app.sos-app.com/emergency/emg_123',
        },
        contactInfo: {
          phone: '+1234567890',
          fcmToken: 'fcm_token_123',
        },
      };

      (notificationQueue.addNotificationJob as jest.Mock).mockResolvedValue({});

      const result = await handleRetry(job, 1);

      expect(result).toBe(true);
      expect(notificationQueue.addNotificationJob).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: NotificationChannel.SMS,
          priority: NotificationPriority.EMERGENCY,
        }),
        expect.any(Object)
      );
    });

    it('should enqueue email fallback when SMS fails', async () => {
      const job: NotificationJob = {
        emergencyId: 'emg_123',
        batchId: 'batch_123',
        recipientId: 'contact_1',
        recipientName: 'Jane Doe',
        channel: NotificationChannel.SMS,
        priority: NotificationPriority.EMERGENCY,
        templateData: {
          userName: 'John Doe',
          emergencyType: 'MEDICAL',
          location: '37.7749, -122.4194',
          emergencyLink: 'https://app.sos-app.com/emergency/emg_123',
        },
        contactInfo: {
          phone: '+1234567890',
          email: 'jane@example.com',
        },
      };

      (notificationQueue.addNotificationJob as jest.Mock).mockResolvedValue({});

      const result = await handleRetry(job, 1);

      expect(result).toBe(true);
      expect(notificationQueue.addNotificationJob).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: NotificationChannel.EMAIL,
        }),
        expect.any(Object)
      );
    });

    it('should not enqueue fallback if contact info not available', async () => {
      const job: NotificationJob = {
        emergencyId: 'emg_123',
        batchId: 'batch_123',
        recipientId: 'contact_1',
        recipientName: 'Jane Doe',
        channel: NotificationChannel.PUSH,
        priority: NotificationPriority.EMERGENCY,
        templateData: {
          userName: 'John Doe',
          emergencyType: 'MEDICAL',
          location: '37.7749, -122.4194',
          emergencyLink: 'https://app.sos-app.com/emergency/emg_123',
        },
        contactInfo: {
          fcmToken: 'fcm_token_123',
        },
      };

      const result = await handleRetry(job, 1);

      expect(result).toBe(false);
      expect(notificationQueue.addNotificationJob).not.toHaveBeenCalled();
    });
  });

  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff delay', () => {
      const delay1 = calculateRetryDelay(1);
      const delay2 = calculateRetryDelay(2);
      const delay3 = calculateRetryDelay(3);

      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    it('should cap delay at maximum', () => {
      const delay = calculateRetryDelay(10);
      const maxDelay = 45000; // From config

      expect(delay).toBeLessThanOrEqual(maxDelay);
    });
  });

  describe('shouldRetry', () => {
    it('should return false if max attempts reached', () => {
      const result = shouldRetry(NotificationChannel.PUSH, 3);

      expect(result).toBe(false);
    });

    it('should return false for permanent errors', () => {
      const result = shouldRetry(NotificationChannel.PUSH, 1, 'INVALID_TOKEN');

      expect(result).toBe(false);
    });

    it('should return true for retryable errors', () => {
      const result = shouldRetry(NotificationChannel.PUSH, 1, 'NETWORK_ERROR');

      expect(result).toBe(true);
    });
  });

  describe('getRetryStrategy', () => {
    it('should return correct strategy for PUSH channel', () => {
      const strategy = getRetryStrategy(NotificationChannel.PUSH);

      expect(strategy.attempts).toBe(3);
      expect(strategy.backoff.type).toBe('exponential');
    });

    it('should return correct strategy for SMS channel', () => {
      const strategy = getRetryStrategy(NotificationChannel.SMS);

      expect(strategy.attempts).toBe(2);
      expect(strategy.backoff.type).toBe('fixed');
    });

    it('should return correct strategy for EMAIL channel', () => {
      const strategy = getRetryStrategy(NotificationChannel.EMAIL);

      expect(strategy.attempts).toBe(3);
      expect(strategy.backoff.type).toBe('exponential');
    });
  });
});
