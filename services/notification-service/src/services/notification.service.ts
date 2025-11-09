import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import {
  Emergency,
  EmergencyContact,
  NotificationJob,
  NotificationChannel,
  NotificationPriority,
  NotificationBatch,
} from '../models/Notification';
import { addBulkNotificationJobs } from '../queues/notification.queue';
import { NotificationBatchModel } from '../db/schemas/notification.schema';

/**
 * Dispatch emergency alert to all emergency contacts via multiple channels
 */
export async function dispatchEmergencyAlert(
  emergency: Emergency,
  contacts: EmergencyContact[]
): Promise<NotificationBatch> {
  const batchId = uuidv4();

  logger.info('Dispatching emergency alert', {
    emergencyId: emergency.id,
    batchId,
    contactCount: contacts.length,
  });

  try {
    // Generate emergency link
    const emergencyLink = generateEmergencyLink(emergency.id);

    // Create notification jobs for each contact and channel
    const jobs: NotificationJob[] = [];

    for (const contact of contacts) {
      const templateData = {
        userName: emergency.userName,
        emergencyType: emergency.emergencyType,
        location: `${emergency.location.latitude}, ${emergency.location.longitude}`,
        address: emergency.location.address,
        emergencyLink,
      };

      const contactInfo = {
        phone: contact.phoneNumber,
        email: contact.email,
        fcmToken: contact.fcmToken,
        apnsToken: contact.apnsToken,
      };

      // Determine priority based on contact priority
      const priority = contact.priority === 'PRIMARY'
        ? NotificationPriority.EMERGENCY
        : contact.priority === 'SECONDARY'
          ? NotificationPriority.HIGH
          : NotificationPriority.NORMAL;

      // Push notification (highest priority)
      if (contact.fcmToken || contact.apnsToken) {
        jobs.push({
          emergencyId: emergency.id,
          batchId,
          recipientId: contact.id,
          recipientName: contact.name,
          channel: NotificationChannel.PUSH,
          priority,
          templateData,
          contactInfo,
        });
      }

      // SMS notification
      if (contact.phoneNumber) {
        jobs.push({
          emergencyId: emergency.id,
          batchId,
          recipientId: contact.id,
          recipientName: contact.name,
          channel: NotificationChannel.SMS,
          priority,
          templateData,
          contactInfo,
        });
      }

      // Email notification
      if (contact.email) {
        jobs.push({
          emergencyId: emergency.id,
          batchId,
          recipientId: contact.id,
          recipientName: contact.name,
          channel: NotificationChannel.EMAIL,
          priority,
          templateData,
          contactInfo,
        });
      }
    }

    // Create batch record
    const batch = await NotificationBatchModel.create({
      batchId,
      emergencyId: emergency.id,
      totalCount: jobs.length,
      pendingCount: jobs.length,
      sentCount: 0,
      deliveredCount: 0,
      failedCount: 0,
    });

    // Add jobs to Bull queue
    await addBulkNotificationJobs(jobs);

    logger.info('Emergency alert dispatched successfully', {
      emergencyId: emergency.id,
      batchId,
      jobCount: jobs.length,
    });

    return {
      batchId,
      emergencyId: emergency.id,
      totalCount: jobs.length,
      sentCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      pendingCount: jobs.length,
      createdAt: batch.createdAt,
    };
  } catch (error: any) {
    logger.error('Failed to dispatch emergency alert', {
      emergencyId: emergency.id,
      batchId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Dispatch location update notification
 */
export async function dispatchLocationUpdate(
  emergencyId: string,
  _location: { latitude: number; longitude: number; address?: string },
  contacts: EmergencyContact[]
): Promise<void> {
  logger.info('Dispatching location update', {
    emergencyId,
    contactCount: contacts.length,
  });

  // For location updates, we primarily use WebSocket (handled elsewhere)
  // But we can optionally send push notifications for significant location changes
  // This is typically not needed as real-time updates are via WebSocket
}

/**
 * Dispatch acknowledgment notification to user
 */
export async function dispatchAcknowledgmentNotification(
  emergencyId: string,
  acknowledgedBy: string,
  userId: string,
  userContactInfo: { fcmToken?: string; apnsToken?: string; phone?: string }
): Promise<void> {
  logger.info('Dispatching acknowledgment notification', {
    emergencyId,
    acknowledgedBy,
    userId,
  });

  const batchId = uuidv4();
  const emergencyLink = generateEmergencyLink(emergencyId);

  const templateData = {
    userName: 'You',
    emergencyType: 'ACKNOWLEDGMENT',
    location: '',
    emergencyLink,
    acknowledgedBy,
  };

  const jobs: NotificationJob[] = [];

  // Push notification to user
  if (userContactInfo.fcmToken || userContactInfo.apnsToken) {
    jobs.push({
      emergencyId,
      batchId,
      recipientId: userId,
      recipientName: 'User',
      channel: NotificationChannel.PUSH,
      priority: NotificationPriority.HIGH,
      templateData: {
        ...templateData,
        userName: acknowledgedBy,
        emergencyType: 'has acknowledged your emergency',
      },
      contactInfo: {
        fcmToken: userContactInfo.fcmToken,
        apnsToken: userContactInfo.apnsToken,
      },
    });
  }

  if (jobs.length > 0) {
    await addBulkNotificationJobs(jobs);
  }
}

/**
 * Get batch status
 */
export async function getBatchStatus(batchId: string): Promise<NotificationBatch | null> {
  try {
    const batch = await NotificationBatchModel.findOne({ batchId }).lean();

    if (!batch) {
      return null;
    }

    return {
      batchId: batch.batchId,
      emergencyId: batch.emergencyId,
      totalCount: batch.totalCount,
      sentCount: batch.sentCount,
      deliveredCount: batch.deliveredCount,
      failedCount: batch.failedCount,
      pendingCount: batch.pendingCount,
      createdAt: batch.createdAt,
      completedAt: batch.completedAt,
    };
  } catch (error: any) {
    logger.error('Failed to get batch status', {
      batchId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Update batch statistics
 */
export async function updateBatchStats(
  batchId: string,
  stats: Partial<{
    sentCount: number;
    deliveredCount: number;
    failedCount: number;
    pendingCount: number;
  }>
): Promise<void> {
  try {
    await NotificationBatchModel.updateOne(
      { batchId },
      {
        $inc: stats,
        $set: {
          completedAt:
            stats.pendingCount === 0 ? new Date() : undefined,
        },
      }
    );
  } catch (error: any) {
    logger.error('Failed to update batch stats', {
      batchId,
      error: error.message,
    });
  }
}

/**
 * Generate emergency link for notifications
 */
function generateEmergencyLink(emergencyId: string): string {
  const baseUrl = process.env.WEB_APP_URL || 'https://app.sos-app.com';
  return `${baseUrl}/emergency/${emergencyId}`;
}
