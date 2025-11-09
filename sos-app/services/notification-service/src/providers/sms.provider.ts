import twilio, { Twilio } from 'twilio';
import { config } from '../config';
import { logger } from '../utils/logger';
import { NotificationJob } from '../models/Notification';

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  status?: string;
}

class SMSProvider {
  private client: Twilio | null = null;
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      if (!config.twilio.accountSid || !config.twilio.authToken || !config.twilio.phoneNumber) {
        logger.warn('Twilio configuration incomplete, SMS provider disabled');
        return;
      }

      this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
      this.initialized = true;

      logger.info('Twilio SMS provider initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize Twilio SMS provider', {
        error: error.message,
      });
    }
  }

  /**
   * Send SMS notification via Twilio
   */
  async sendSMS(job: NotificationJob): Promise<SMSResult> {
    if (!this.initialized || !this.client) {
      return {
        success: false,
        error: 'Twilio SMS provider not initialized',
      };
    }

    const phoneNumber = job.contactInfo.phone;
    if (!phoneNumber) {
      return {
        success: false,
        error: 'Phone number not provided',
      };
    }

    try {
      const message = this.formatSMSMessage(job);

      const response = await this.client.messages.create({
        body: message,
        from: config.twilio.phoneNumber,
        to: phoneNumber,
        statusCallback: this.getStatusCallbackUrl(job),
      });

      logger.info('SMS sent successfully', {
        emergencyId: job.emergencyId,
        recipientId: job.recipientId,
        messageId: response.sid,
        status: response.status,
        to: phoneNumber,
      });

      return {
        success: true,
        messageId: response.sid,
        status: response.status,
      };
    } catch (error: any) {
      logger.error('Failed to send SMS', {
        emergencyId: job.emergencyId,
        recipientId: job.recipientId,
        error: error.message,
        code: error.code,
        status: error.status,
      });

      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Send SMS to multiple recipients
   */
  async sendBulkSMS(
    phoneNumbers: string[],
    job: NotificationJob
  ): Promise<SMSResult[]> {
    if (!this.initialized || !this.client) {
      throw new Error('Twilio SMS provider not initialized');
    }

    const message = this.formatSMSMessage(job);

    const promises = phoneNumbers.map(async (phoneNumber) => {
      try {
        const response = await this.client!.messages.create({
          body: message,
          from: config.twilio.phoneNumber,
          to: phoneNumber,
        });

        return {
          success: true,
          messageId: response.sid,
          status: response.status,
        };
      } catch (error: any) {
        return {
          success: false,
          error: this.getErrorMessage(error),
        };
      }
    });

    return Promise.all(promises);
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageId: string): Promise<string | null> {
    if (!this.initialized || !this.client) {
      return null;
    }

    try {
      const message = await this.client.messages(messageId).fetch();
      return message.status;
    } catch (error: any) {
      logger.error('Failed to fetch message status', {
        messageId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Validate phone number format
   */
  async validatePhoneNumber(phoneNumber: string): Promise<boolean> {
    if (!this.initialized || !this.client) {
      return false;
    }

    try {
      const lookup = await this.client.lookups.v2
        .phoneNumbers(phoneNumber)
        .fetch();

      return lookup.valid || false;
    } catch (error) {
      return false;
    }
  }

  private formatSMSMessage(job: NotificationJob): string {
    const { userName, emergencyType, address, emergencyLink } = job.templateData;
    const location = address || job.templateData.location;

    return (
      `🆘 EMERGENCY ALERT!\n\n` +
      `${userName} has triggered a ${emergencyType} emergency.\n\n` +
      `Location: ${location}\n\n` +
      `View details and respond: ${emergencyLink}\n\n` +
      `This is an automated emergency notification from SOS App.`
    );
  }

  private getStatusCallbackUrl(job: NotificationJob): string {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3005';
    return `${baseUrl}/api/v1/webhooks/twilio/status?emergencyId=${job.emergencyId}&recipientId=${job.recipientId}`;
  }

  private getErrorMessage(error: any): string {
    const errorCode = error.code;

    switch (errorCode) {
      case 21211:
        return 'Invalid phone number';
      case 21408:
        return 'Permission to send SMS not granted';
      case 21610:
        return 'Phone number is blacklisted';
      case 21614:
        return 'Invalid mobile number';
      case 30001:
        return 'Queue overflow';
      case 30002:
        return 'Account suspended';
      case 30003:
        return 'Unreachable destination';
      case 30004:
        return 'Message blocked';
      case 30005:
        return 'Unknown destination';
      case 30006:
        return 'Landline or unreachable carrier';
      case 30007:
        return 'Carrier violation';
      case 30008:
        return 'Unknown error';
      case 30009:
        return 'Missing segment';
      case 30010:
        return 'Message price exceeds limit';
      case 21601:
        return 'Phone number is not SMS-capable';
      case 21602:
        return 'Message exceeds maximum length';
      case 21603:
        return 'From number is required';
      case 21604:
        return 'To number is required';
      case 21605:
        return 'Body is required';
      case 21606:
        return 'From number is not valid';
      case 21201:
        return 'No International Authorization';
      case 21612:
        return 'Cannot route to this number';
      case 21617:
        return 'Phone number does not belong to you';
      default:
        return error.message || 'SMS delivery failed';
    }
  }
}

// Export singleton instance
export const smsProvider = new SMSProvider();
