import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { NotificationModel } from '../db/schemas/notification.schema';
import { NotificationStatus } from '../models/Notification';
import { updateBatchStats } from '../services/notification.service';

const router = Router();

/**
 * Twilio SMS delivery status webhook
 * https://www.twilio.com/docs/sms/api/message-resource#message-status-values
 */
router.post('/twilio/status', async (req: Request, res: Response) => {
  try {
    const {
      MessageSid,
      MessageStatus,
      ErrorCode,
      ErrorMessage,
    } = req.body;

    const { emergencyId, recipientId } = req.query;

    logger.info('Received Twilio status webhook', {
      messageSid: MessageSid,
      status: MessageStatus,
      emergencyId,
      recipientId,
    });

    // Map Twilio status to our notification status
    let notificationStatus: NotificationStatus;
    let deliveredAt: Date | undefined;

    switch (MessageStatus) {
      case 'queued':
      case 'sending':
        notificationStatus = NotificationStatus.SENT;
        break;

      case 'sent':
      case 'delivered':
        notificationStatus = NotificationStatus.DELIVERED;
        deliveredAt = new Date();
        break;

      case 'failed':
      case 'undelivered':
        notificationStatus = NotificationStatus.FAILED;
        break;

      default:
        notificationStatus = NotificationStatus.PENDING;
    }

    // Update notification in database
    const notification = await NotificationModel.findOneAndUpdate(
      {
        emergencyId: emergencyId as string,
        recipientId: recipientId as string,
        channel: 'SMS',
      },
      {
        $set: {
          status: notificationStatus,
          deliveredAt,
          failureReason: ErrorMessage,
          'metadata.messageId': MessageSid,
          'metadata.errorCode': ErrorCode,
          'metadata.provider': 'twilio',
        },
      },
      { new: true, sort: { createdAt: -1 } }
    );

    if (notification && notificationStatus === NotificationStatus.DELIVERED) {
      await updateBatchStats(notification.batchId!, {
        deliveredCount: 1,
      });
    }

    res.status(200).send('OK');
  } catch (error: any) {
    logger.error('Error processing Twilio webhook', {
      error: error.message,
      body: req.body,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * SendGrid email delivery status webhook
 * https://docs.sendgrid.com/for-developers/tracking-events/event
 */
router.post('/sendgrid/events', async (req: Request, res: Response) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];

    logger.info('Received SendGrid webhook', {
      eventCount: events.length,
    });

    for (const event of events) {
      const {
        event: eventType,
        sg_message_id,
        email,
        timestamp,
        reason,
        emergencyId,
        recipientId,
      } = event;

      logger.debug('Processing SendGrid event', {
        eventType,
        messageId: sg_message_id,
        email,
        emergencyId,
        recipientId,
      });

      // Map SendGrid event to our notification status
      let notificationStatus: NotificationStatus | null = null;
      let deliveredAt: Date | undefined;

      switch (eventType) {
        case 'processed':
        case 'delivered':
          notificationStatus = NotificationStatus.DELIVERED;
          deliveredAt = new Date(timestamp * 1000);
          break;

        case 'bounce':
        case 'blocked':
        case 'dropped':
          notificationStatus = NotificationStatus.FAILED;
          break;

        case 'deferred':
          // Email temporarily delayed, keep as SENT
          break;

        default:
          // opened, click, etc. - no status change needed
          break;
      }

      if (notificationStatus && (emergencyId || recipientId)) {
        // Update notification in database
        const query: any = { channel: 'EMAIL' };
        if (emergencyId) query.emergencyId = emergencyId;
        if (recipientId) query.recipientId = recipientId;
        if (email) query.recipientEmail = email;

        const notification = await NotificationModel.findOneAndUpdate(
          query,
          {
            $set: {
              status: notificationStatus,
              deliveredAt,
              failureReason: reason,
              'metadata.messageId': sg_message_id,
              'metadata.provider': 'sendgrid',
            },
          },
          { new: true, sort: { createdAt: -1 } }
        );

        if (notification && notificationStatus === NotificationStatus.DELIVERED) {
          await updateBatchStats(notification.batchId!, {
            deliveredCount: 1,
          });
        }
      }
    }

    res.status(200).send('OK');
  } catch (error: any) {
    logger.error('Error processing SendGrid webhook', {
      error: error.message,
      body: req.body,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * FCM delivery receipt webhook (if configured)
 */
router.post('/fcm/receipt', async (req: Request, res: Response) => {
  try {
    const { messageId, status, error, emergencyId, recipientId } = req.body;

    logger.info('Received FCM receipt webhook', {
      messageId,
      status,
      emergencyId,
      recipientId,
    });

    let notificationStatus: NotificationStatus;
    let deliveredAt: Date | undefined;

    if (status === 'delivered') {
      notificationStatus = NotificationStatus.DELIVERED;
      deliveredAt = new Date();
    } else if (status === 'failed') {
      notificationStatus = NotificationStatus.FAILED;
    } else {
      notificationStatus = NotificationStatus.SENT;
    }

    // Update notification
    const notification = await NotificationModel.findOneAndUpdate(
      {
        emergencyId,
        recipientId,
        channel: 'PUSH',
        'metadata.fcmToken': { $exists: true },
      },
      {
        $set: {
          status: notificationStatus,
          deliveredAt,
          failureReason: error,
          'metadata.messageId': messageId,
        },
      },
      { new: true, sort: { createdAt: -1 } }
    );

    if (notification && notificationStatus === NotificationStatus.DELIVERED) {
      await updateBatchStats(notification.batchId!, {
        deliveredCount: 1,
      });
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    logger.error('Error processing FCM webhook', {
      error: error.message,
      body: req.body,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Generic delivery confirmation endpoint
 */
router.post('/delivery/confirm', async (req: Request, res: Response) => {
  try {
    const {
      notificationId,
      emergencyId,
      recipientId,
      channel,
      status,
      deliveredAt,
      metadata,
    } = req.body;

    logger.info('Received delivery confirmation', {
      notificationId,
      emergencyId,
      recipientId,
      channel,
      status,
    });

    const updateData: any = {
      status,
      ...(deliveredAt && { deliveredAt: new Date(deliveredAt) }),
      ...(metadata && { metadata }),
    };

    const notification = await NotificationModel.findOneAndUpdate(
      {
        ...(notificationId && { _id: notificationId }),
        ...(emergencyId && { emergencyId }),
        ...(recipientId && { recipientId }),
        ...(channel && { channel }),
      },
      { $set: updateData },
      { new: true, sort: { createdAt: -1 } }
    );

    if (notification && status === NotificationStatus.DELIVERED) {
      await updateBatchStats(notification.batchId!, {
        deliveredCount: 1,
      });
    }

    res.status(200).json({ success: true, notification });
  } catch (error: any) {
    logger.error('Error processing delivery confirmation', {
      error: error.message,
      body: req.body,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Health check for webhook endpoints
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    endpoints: [
      '/api/v1/webhooks/twilio/status',
      '/api/v1/webhooks/sendgrid/events',
      '/api/v1/webhooks/fcm/receipt',
      '/api/v1/webhooks/delivery/confirm',
    ],
  });
});

export { router as webhookRoutes };
