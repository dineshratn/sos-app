import sgMail, { MailDataRequired } from '@sendgrid/mail';
import { config } from '../config';
import { logger } from '../utils/logger';
import { NotificationJob } from '../models/Notification';

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailProvider {
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      if (!config.sendgrid.apiKey) {
        logger.warn('SendGrid API key not configured, email provider disabled');
        return;
      }

      sgMail.setApiKey(config.sendgrid.apiKey);
      this.initialized = true;

      logger.info('SendGrid email provider initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize SendGrid email provider', {
        error: error.message,
      });
    }
  }

  /**
   * Send email notification via SendGrid
   */
  async sendEmail(job: NotificationJob): Promise<EmailResult> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'SendGrid email provider not initialized',
      };
    }

    const email = job.contactInfo.email;
    if (!email) {
      return {
        success: false,
        error: 'Email address not provided',
      };
    }

    try {
      const msg: MailDataRequired = {
        to: email,
        from: {
          email: config.sendgrid.fromEmail,
          name: config.sendgrid.fromName,
        },
        replyTo: config.sendgrid.fromEmail,
        subject: this.getEmailSubject(job),
        text: this.getPlainTextContent(job),
        html: this.getHtmlContent(job),
        trackingSettings: {
          clickTracking: {
            enable: true,
          },
          openTracking: {
            enable: true,
          },
        },
        customArgs: {
          emergencyId: job.emergencyId,
          batchId: job.batchId,
          recipientId: job.recipientId,
        },
      };

      const [response] = await sgMail.send(msg);

      logger.info('Email sent successfully', {
        emergencyId: job.emergencyId,
        recipientId: job.recipientId,
        messageId: response.headers['x-message-id'],
        to: email,
      });

      return {
        success: true,
        messageId: response.headers['x-message-id'] as string,
      };
    } catch (error: any) {
      logger.error('Failed to send email', {
        emergencyId: job.emergencyId,
        recipientId: job.recipientId,
        error: error.message,
        code: error.code,
        response: error.response?.body,
      });

      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Send to multiple recipients
   */
  async sendBulkEmail(
    emails: string[],
    job: NotificationJob
  ): Promise<EmailResult[]> {
    if (!this.initialized) {
      throw new Error('SendGrid email provider not initialized');
    }

    const messages: MailDataRequired[] = emails.map((email) => ({
      to: email,
      from: {
        email: config.sendgrid.fromEmail,
        name: config.sendgrid.fromName,
      },
      subject: this.getEmailSubject(job),
      text: this.getPlainTextContent(job),
      html: this.getHtmlContent(job),
    }));

    try {
      const responses = await sgMail.send(messages);

      return (responses as any[]).map((response: any) => ({
        success: true,
        messageId: Array.isArray(response) ? response[0]?.headers['x-message-id'] as string : response?.headers['x-message-id'] as string,
      }));
    } catch (error: any) {
      logger.error('Failed to send bulk email', {
        emergencyId: job.emergencyId,
        error: error.message,
      });

      return emails.map(() => ({
        success: false,
        error: this.getErrorMessage(error),
      }));
    }
  }

  private getEmailSubject(job: NotificationJob): string {
    return `🆘 EMERGENCY: ${job.templateData.userName} needs immediate help`;
  }

  private getPlainTextContent(job: NotificationJob): string {
    const { userName, emergencyType, location, address, emergencyLink } = job.templateData;
    const locationText = address || location;

    return (
      `EMERGENCY ALERT\n\n` +
      `${userName} has triggered a ${emergencyType} emergency and needs your immediate assistance.\n\n` +
      `LOCATION:\n${locationText}\n\n` +
      `WHAT TO DO:\n` +
      `1. Click the link below to view the live emergency details\n` +
      `2. See ${userName}'s real-time location\n` +
      `3. Acknowledge that you've received this alert\n` +
      `4. Contact emergency services if needed\n\n` +
      `VIEW EMERGENCY:\n${emergencyLink}\n\n` +
      `This is an automated emergency notification from SOS App.\n` +
      `Time sent: ${new Date().toLocaleString()}\n\n` +
      `If you cannot respond, this alert will be escalated to other emergency contacts.`
    );
  }

  private getHtmlContent(job: NotificationJob): string {
    const { userName, emergencyType, location, address, emergencyLink } = job.templateData;
    const locationText = address || location;
    const mapUrl = `https://maps.google.com/?q=${location}`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Emergency Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #dc2626; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🆘 EMERGENCY ALERT</h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #333333; line-height: 1.6; margin: 0 0 20px 0;">
                <strong>${userName}</strong> has triggered a <strong style="color: #dc2626;">${emergencyType}</strong> emergency and needs your immediate assistance.
              </p>

              <!-- Location Box -->
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #991b1b; font-size: 16px;">📍 Location</h3>
                <p style="margin: 0; color: #333333; font-size: 15px;">${locationText}</p>
                <a href="${mapUrl}" style="display: inline-block; margin-top: 10px; color: #2563eb; text-decoration: none; font-size: 14px;">View on Google Maps →</a>
              </div>

              <!-- Action Steps -->
              <h3 style="color: #333333; font-size: 18px; margin: 30px 0 15px 0;">What to do:</h3>
              <ol style="color: #555555; font-size: 15px; line-height: 1.8; padding-left: 20px;">
                <li>Click the button below to view live emergency details</li>
                <li>See ${userName}'s real-time location</li>
                <li>Acknowledge that you've received this alert</li>
                <li>Contact emergency services if needed</li>
              </ol>

              <!-- Call to Action Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${emergencyLink}" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">VIEW EMERGENCY DETAILS</a>
              </div>

              <!-- Warning Box -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #78350f; font-size: 14px;">
                  ⚠️ <strong>Important:</strong> If you cannot respond, this alert will be escalated to other emergency contacts.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px;">
                This is an automated emergency notification from SOS App
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Time sent: ${new Date().toLocaleString()}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  private getErrorMessage(error: any): string {
    const statusCode = error.code;

    switch (statusCode) {
      case 400:
        return 'Invalid email request';
      case 401:
        return 'Invalid API key';
      case 403:
        return 'Forbidden - insufficient permissions';
      case 404:
        return 'Email endpoint not found';
      case 413:
        return 'Payload too large';
      case 429:
        return 'Rate limit exceeded';
      case 500:
        return 'SendGrid internal server error';
      case 503:
        return 'SendGrid service unavailable';
      default:
        return error.message || 'Email delivery failed';
    }
  }
}

// Export singleton instance
export const emailProvider = new EmailProvider();
