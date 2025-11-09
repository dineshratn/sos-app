import admin from 'firebase-admin';
import { config } from '../config';
import { logger } from '../utils/logger';
import { NotificationJob } from '../models/Notification';

export interface FCMResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class FCMProvider {
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      if (!config.fcm.projectId || !config.fcm.privateKey || !config.fcm.clientEmail) {
        logger.warn('FCM configuration incomplete, provider disabled');
        return;
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.fcm.projectId,
          privateKey: config.fcm.privateKey,
          clientEmail: config.fcm.clientEmail,
        }),
      });

      this.initialized = true;
      logger.info('FCM provider initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize FCM provider', {
        error: error.message,
      });
    }
  }

  /**
   * Send push notification via Firebase Cloud Messaging
   */
  async sendPushNotification(job: NotificationJob): Promise<FCMResult> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'FCM provider not initialized',
      };
    }

    const fcmToken = job.contactInfo.fcmToken;
    if (!fcmToken) {
      return {
        success: false,
        error: 'FCM token not provided',
      };
    }

    try {
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: this.getNotificationTitle(job),
          body: this.getNotificationBody(job),
        },
        data: {
          emergencyId: job.emergencyId,
          batchId: job.batchId,
          recipientId: job.recipientId,
          emergencyType: job.templateData.emergencyType,
          userName: job.templateData.userName,
          location: job.templateData.location,
          emergencyLink: job.templateData.emergencyLink,
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'emergency-alerts',
            priority: 'max',
            defaultSound: true,
            defaultVibrateTimings: true,
            visibility: 'public',
            tag: job.emergencyId,
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
          payload: {
            aps: {
              alert: {
                title: this.getNotificationTitle(job),
                body: this.getNotificationBody(job),
              },
              sound: 'emergency.caf',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);

      logger.info('FCM notification sent successfully', {
        emergencyId: job.emergencyId,
        recipientId: job.recipientId,
        messageId: response,
      });

      return {
        success: true,
        messageId: response,
      };
    } catch (error: any) {
      logger.error('Failed to send FCM notification', {
        emergencyId: job.emergencyId,
        recipientId: job.recipientId,
        error: error.message,
        errorCode: error.code,
      });

      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Send to multiple tokens (multicast)
   */
  async sendMulticast(tokens: string[], job: NotificationJob): Promise<admin.messaging.BatchResponse> {
    if (!this.initialized) {
      throw new Error('FCM provider not initialized');
    }

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: this.getNotificationTitle(job),
        body: this.getNotificationBody(job),
      },
      data: {
        emergencyId: job.emergencyId,
        emergencyType: job.templateData.emergencyType,
        userName: job.templateData.userName,
        location: job.templateData.location,
        emergencyLink: job.templateData.emergencyLink,
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'emergency-alerts',
          priority: 'max',
          defaultSound: true,
        },
      },
    };

    return await (admin.messaging() as any).sendMulticast(message);
  }

  /**
   * Verify if token is valid
   */
  async verifyToken(token: string): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    try {
      await admin.messaging().send({
        token,
        data: { test: 'true' },
      }, true); // Dry run

      return true;
    } catch (error) {
      return false;
    }
  }

  private getNotificationTitle(job: NotificationJob): string {
    return `🆘 EMERGENCY: ${job.templateData.userName} needs help!`;
  }

  private getNotificationBody(job: NotificationJob): string {
    const address = job.templateData.address || 'Unknown location';
    return `${job.templateData.emergencyType} emergency. Location: ${address}. Tap to view details and respond.`;
  }

  private getErrorMessage(error: any): string {
    const errorCode = error.code;

    switch (errorCode) {
      case 'messaging/invalid-registration-token':
      case 'messaging/registration-token-not-registered':
        return 'Invalid or expired FCM token';
      case 'messaging/invalid-package-name':
        return 'Invalid app package name';
      case 'messaging/message-rate-exceeded':
        return 'Rate limit exceeded';
      case 'messaging/device-message-rate-exceeded':
        return 'Device rate limit exceeded';
      case 'messaging/too-many-topics':
        return 'Too many topics subscribed';
      case 'messaging/invalid-apns-credentials':
        return 'Invalid APNs credentials';
      case 'messaging/mismatched-credential':
        return 'Credential mismatch';
      case 'messaging/authentication-error':
        return 'Authentication failed';
      case 'messaging/server-unavailable':
        return 'FCM server unavailable';
      default:
        return error.message || 'Unknown FCM error';
    }
  }
}

// Export singleton instance
export const fcmProvider = new FCMProvider();
