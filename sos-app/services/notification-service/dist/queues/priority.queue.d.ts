import Queue, { Job, JobOptions } from 'bull';
import { NotificationJob } from '../models/Notification';
export declare const priorityQueue: Queue.Queue<NotificationJob>;
/**
 * Add emergency notification to priority queue
 */
export declare function addPriorityNotification(jobData: NotificationJob, options?: Partial<JobOptions>): Promise<Job<NotificationJob>>;
/**
 * Add bulk priority notifications
 */
export declare function addBulkPriorityNotifications(jobs: NotificationJob[]): Promise<Job<NotificationJob>[]>;
/**
 * Check if notification should use priority queue
 */
export declare function shouldUsePriorityQueue(jobData: NotificationJob): boolean;
/**
 * Route notification to appropriate queue
 */
export declare function routeNotification(jobData: NotificationJob, options?: Partial<JobOptions>): Promise<Job<NotificationJob>>;
/**
 * Get priority queue statistics
 */
export declare function getPriorityQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    total: number;
}>;
/**
 * Pause priority queue
 */
export declare function pausePriorityQueue(): Promise<void>;
/**
 * Resume priority queue
 */
export declare function resumePriorityQueue(): Promise<void>;
/**
 * Clean old jobs
 */
export declare function cleanPriorityQueueJobs(grace?: number): Promise<void>;
export { priorityQueue as default };
//# sourceMappingURL=priority.queue.d.ts.map