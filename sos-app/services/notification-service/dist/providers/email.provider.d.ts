import { NotificationJob } from '../models/Notification';
export interface EmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}
declare class EmailProvider {
    private initialized;
    constructor();
    private initialize;
    /**
     * Send email notification via SendGrid
     */
    sendEmail(job: NotificationJob): Promise<EmailResult>;
    /**
     * Send to multiple recipients
     */
    sendBulkEmail(emails: string[], job: NotificationJob): Promise<EmailResult[]>;
    private getEmailSubject;
    private getPlainTextContent;
    private getHtmlContent;
    private getErrorMessage;
}
export declare const emailProvider: EmailProvider;
export {};
//# sourceMappingURL=email.provider.d.ts.map