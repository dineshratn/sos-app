import Queue, { Job, JobOptions } from 'bull';
import { NotificationJob } from '../models/Notification';
export declare const notificationQueue: Queue.Queue<NotificationJob>;
/**
 * Add a notification job to the queue
 */
export declare function addNotificationJob(jobData: NotificationJob, options?: Partial<JobOptions>): Promise<Job<NotificationJob>>;
/**
 * Add multiple notification jobs in bulk
 */
export declare function addBulkNotificationJobs(jobs: NotificationJob[]): Promise<Job<NotificationJob>[]>;
/**
 * Get job counts by status
 */
export declare function getJobCounts(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    total: number;
}>;
/**
 * Clean old jobs
 */
export declare function cleanOldJobs(grace?: number): Promise<void>;
export { notificationQueue as default };
//# sourceMappingURL=notification.queue.d.ts.map