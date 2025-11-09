import { Job } from 'bull';
import { NotificationJob } from '../models/Notification';
/**
 * Initialize notification worker to process jobs from the queue
 */
export declare function initializeNotificationWorker(): Promise<void>;
/**
 * Process individual notification job
 */
declare function processNotificationJob(job: Job<NotificationJob>): Promise<any>;
export { processNotificationJob };
//# sourceMappingURL=notification.worker.d.ts.map