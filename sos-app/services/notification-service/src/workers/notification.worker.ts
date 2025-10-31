import { Job } from 'bull';
import { logger } from '../utils/logger';
import {
  NotificationJob,
  NotificationChannel,
  NotificationStatus,
} from '../models/Notification';
import { NotificationModel } from '../db/schemas/notification.schema';
import { fcmProvider } from '../providers/fcm.provider';
import { apnsProvider } from '../providers/apns.provider';
import { smsProvider } from '../providers/sms.provider';
import { emailProvider } from '../providers/email.provider';
import { notificationQueue } from '../queues/notification.queue';
import { updateBatchStats } from '../services/notification.service';
import { handleRetry } from '../services/retry.service';

/**
 * Initialize notification worker to process jobs from the queue
 */
export async function initializeNotificationWorker(): Promise<void> {
  logger.info('Initializing notification worker');

  // Process jobs with concurrency based on channel
  notificationQueue.process('*', 10, async (job: Job<NotificationJob>) => {
    return await processNotificationJob(job);
  });

  logger.info('Notification worker initialized with concurrency: 10');
}

/**
 * Process individual notification job
 */
async function processNotificationJob(job: Job<NotificationJob>): Promise<any> {
  const jobData = job.data;
  const notificationId = job.id as string;

  logger.info('Processing notification job', {
    jobId: notificationId,
    emergencyId: jobData.emergencyId,
    recipientId: jobData.recipientId,
    channel: jobData.channel,
    attempt: job.attemptsMade + 1,
  });

  // Create notification record
  const notification = await NotificationModel.create({
    emergencyId: jobData.emergencyId,
    batchId: jobData.batchId,
    recipientId: jobData.recipientId,
    recipientName: jobData.recipientName,
    recipientPhone: jobData.contactInfo.phone,
    recipientEmail: jobData.contactInfo.email,
    channel: jobData.channel,
    status: NotificationStatus.QUEUED,
    priority: jobData.priority,
    content: generateNotificationContent(jobData),
    retryCount: job.attemptsMade,
    maxRetries: job.opts.attempts || 3,
  });

  try {
    let result: any;

    // Send notification via appropriate channel
    switch (jobData.channel) {
      case NotificationChannel.PUSH:
        result = await sendPushNotification(jobData);
        break;

      case NotificationChannel.SMS:
        result = await sendSMSNotification(jobData);
        break;

      case NotificationChannel.EMAIL:
        result = await sendEmailNotification(jobData);
        break;

      default:
        throw new Error(`Unsupported notification channel: ${jobData.channel}`);
    }

    if (result.success) {
      // Update notification as sent
      await NotificationModel.updateOne(
        { _id: notification._id },
        {
          $set: {
            status: NotificationStatus.SENT,
            sentAt: new Date(),
            'metadata.messageId': result.messageId,
          },
        }
      );

      // Update batch stats
      await updateBatchStats(jobData.batchId, {
        sentCount: 1,
        pendingCount: -1,
      });

      logger.info('Notification sent successfully', {
        jobId: notificationId,
        emergencyId: jobData.emergencyId,
        channel: jobData.channel,
        messageId: result.messageId,
      });

      return result;
    } else {
      // Handle failure
      throw new Error(result.error || 'Notification delivery failed');
    }
  } catch (error: any) {
    logger.error('Failed to process notification job', {
      jobId: notificationId,
      emergencyId: jobData.emergencyId,
      channel: jobData.channel,
      attempt: job.attemptsMade + 1,
      error: error.message,
    });

    // Update notification as failed
    await NotificationModel.updateOne(
      { _id: notification._id },
      {
        $set: {
          status: NotificationStatus.FAILED,
          failedAt: new Date(),
          failureReason: error.message,
        },
      }
    );

    // Check if we should retry with fallback channel
    const shouldRetryFallback = await handleRetry(jobData, job.attemptsMade + 1);

    // If this is the last attempt, update batch stats
    if (job.attemptsMade + 1 >= (job.opts.attempts || 3)) {
      await updateBatchStats(jobData.batchId, {
        failedCount: 1,
        pendingCount: -1,
      });
    }

    // Re-throw error to trigger Bull's retry mechanism
    throw error;
  }
}

/**
 * Send push notification
 */
async function sendPushNotification(job: NotificationJob): Promise<any> {
  // Determine which provider to use based on available token
  if (job.contactInfo.fcmToken) {
    return await fcmProvider.sendPushNotification(job);
  } else if (job.contactInfo.apnsToken) {
    return await apnsProvider.sendCriticalNotification(job);
  } else {
    return {
      success: false,
      error: 'No push notification token available',
    };
  }
}

/**
 * Send SMS notification
 */
async function sendSMSNotification(job: NotificationJob): Promise<any> {
  return await smsProvider.sendSMS(job);
}

/**
 * Send email notification
 */
async function sendEmailNotification(job: NotificationJob): Promise<any> {
  return await emailProvider.sendEmail(job);
}

/**
 * Generate notification content based on channel
 */
function generateNotificationContent(job: NotificationJob): string {
  const { userName, emergencyType, location, address } = job.templateData;
  const locationText = address || location;

  switch (job.channel) {
    case NotificationChannel.PUSH:
      return `${userName} needs help! ${emergencyType} emergency at ${locationText}`;

    case NotificationChannel.SMS:
      return (
        `🆘 EMERGENCY ALERT!\n` +
        `${userName} has triggered a ${emergencyType} emergency.\n` +
        `Location: ${locationText}\n` +
        `View details: ${job.templateData.emergencyLink}`
      );

    case NotificationChannel.EMAIL:
      return `Emergency alert: ${userName} needs immediate assistance`;

    default:
      return `Emergency: ${userName} needs help`;
  }
}

/**
 * Handle job completion (called by Bull)
 */
notificationQueue.on('completed', async (job: Job<NotificationJob>, result: any) => {
  logger.info('Job completed', {
    jobId: job.id,
    emergencyId: job.data.emergencyId,
    channel: job.data.channel,
  });

  // If delivery confirmation is received, update status to DELIVERED
  if (result.delivered) {
    const notification = await NotificationModel.findOneAndUpdate(
      {
        emergencyId: job.data.emergencyId,
        recipientId: job.data.recipientId,
        channel: job.data.channel,
      },
      {
        $set: {
          status: NotificationStatus.DELIVERED,
          deliveredAt: new Date(),
        },
      },
      { new: true }
    );

    if (notification) {
      await updateBatchStats(job.data.batchId, {
        deliveredCount: 1,
      });
    }
  }
});

/**
 * Handle job failure (called by Bull)
 */
notificationQueue.on('failed', async (job: Job<NotificationJob>, error: Error) => {
  logger.error('Job failed permanently', {
    jobId: job?.id,
    emergencyId: job?.data?.emergencyId,
    channel: job?.data?.channel,
    attempts: job?.attemptsMade,
    error: error.message,
  });

  // Final failure - all retries exhausted
  if (job && job.data) {
    await NotificationModel.updateOne(
      {
        emergencyId: job.data.emergencyId,
        recipientId: job.data.recipientId,
        channel: job.data.channel,
      },
      {
        $set: {
          status: NotificationStatus.FAILED,
          failedAt: new Date(),
          failureReason: error.message,
        },
      }
    );
  }
});

export { processNotificationJob };
