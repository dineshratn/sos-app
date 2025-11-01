import Queue, { Job, JobOptions } from 'bull';
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { NotificationJob, NotificationPriority } from '../models/Notification';

/**
 * Priority queue for high-priority emergency notifications
 * This queue has higher concurrency and processes jobs faster than regular queue
 */

// Create Redis client for priority queue
const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db + 1, // Use different DB for priority queue
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const subscriberClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db + 1,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Create priority queue with faster processing
export const priorityQueue = new Queue<NotificationJob>('priority-notifications', {
  createClient: (type) => {
    switch (type) {
      case 'client':
        return redisClient;
      case 'subscriber':
        return subscriberClient;
      case 'bclient':
        return new Redis({
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          db: config.redis.db + 1,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        });
      default:
        return new Redis({
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          db: config.redis.db + 1,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        });
    }
  },
  defaultJobOptions: {
    attempts: config.notification.retryAttempts,
    backoff: {
      type: 'exponential',
      delay: config.notification.initialRetryDelay,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
    priority: 1, // Highest priority
  },
  settings: {
    stalledInterval: 15000, // Check for stalled jobs every 15s (faster than regular queue)
    maxStalledCount: 2,
    lockDuration: 30000, // 30s lock duration
  },
});

/**
 * Add emergency notification to priority queue
 */
export async function addPriorityNotification(
  jobData: NotificationJob,
  options?: Partial<JobOptions>
): Promise<Job<NotificationJob>> {
  const job = await priorityQueue.add(jobData, {
    ...options,
    delay: 0, // Process immediately
    priority: 1, // Highest priority
    jobId: `priority-${jobData.emergencyId}-${jobData.recipientId}-${jobData.channel}-${Date.now()}`,
  });

  logger.info('Priority notification job added to queue', {
    jobId: job.id,
    emergencyId: jobData.emergencyId,
    recipientId: jobData.recipientId,
    channel: jobData.channel,
  });

  return job;
}

/**
 * Add bulk priority notifications
 */
export async function addBulkPriorityNotifications(
  jobs: NotificationJob[]
): Promise<Job<NotificationJob>[]> {
  const bulkJobs = jobs.map((jobData) => ({
    name: 'priority-notification',
    data: jobData,
    opts: {
      delay: 0,
      priority: 1,
      jobId: `priority-${jobData.emergencyId}-${jobData.recipientId}-${jobData.channel}-${Date.now()}`,
    },
  }));

  const addedJobs = await priorityQueue.addBulk(bulkJobs);

  logger.info('Bulk priority notification jobs added to queue', {
    count: addedJobs.length,
  });

  return addedJobs;
}

/**
 * Check if notification should use priority queue
 */
export function shouldUsePriorityQueue(jobData: NotificationJob): boolean {
  // Use priority queue for:
  // 1. Emergency priority notifications
  // 2. High priority notifications
  // 3. Primary contacts
  return (
    jobData.priority === NotificationPriority.EMERGENCY ||
    jobData.priority === NotificationPriority.HIGH
  );
}

/**
 * Route notification to appropriate queue
 */
export async function routeNotification(
  jobData: NotificationJob,
  options?: Partial<JobOptions>
): Promise<Job<NotificationJob>> {
  if (shouldUsePriorityQueue(jobData)) {
    return await addPriorityNotification(jobData, options);
  } else {
    // Import regular queue dynamically to avoid circular dependency
    const { addNotificationJob } = await import('./notification.queue');
    return await addNotificationJob(jobData, options);
  }
}

/**
 * Get priority queue statistics
 */
export async function getPriorityQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    priorityQueue.getWaitingCount(),
    priorityQueue.getActiveCount(),
    priorityQueue.getCompletedCount(),
    priorityQueue.getFailedCount(),
    priorityQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Pause priority queue
 */
export async function pausePriorityQueue(): Promise<void> {
  await priorityQueue.pause();
  logger.info('Priority queue paused');
}

/**
 * Resume priority queue
 */
export async function resumePriorityQueue(): Promise<void> {
  await priorityQueue.resume();
  logger.info('Priority queue resumed');
}

/**
 * Clean old jobs
 */
export async function cleanPriorityQueueJobs(
  grace: number = 12 * 60 * 60 * 1000 // 12 hours
): Promise<void> {
  await priorityQueue.clean(grace, 'completed');
  await priorityQueue.clean(grace, 'failed');
  logger.info('Cleaned old jobs from priority queue', { graceMs: grace });
}

// Event listeners for monitoring
priorityQueue.on('error', (error) => {
  logger.error('Priority queue error', { error: error.message, stack: error.stack });
});

priorityQueue.on('waiting', (jobId) => {
  logger.debug('Priority job waiting', { jobId });
});

priorityQueue.on('active', (job) => {
  logger.debug('Priority job active', {
    jobId: job.id,
    emergencyId: job.data.emergencyId,
    channel: job.data.channel,
  });
});

priorityQueue.on('completed', (job, result) => {
  logger.info('Priority job completed', {
    jobId: job.id,
    emergencyId: job.data.emergencyId,
    channel: job.data.channel,
    result,
  });
});

priorityQueue.on('failed', (job, error) => {
  logger.error('Priority job failed', {
    jobId: job?.id,
    emergencyId: job?.data?.emergencyId,
    channel: job?.data?.channel,
    error: error.message,
    attemptsMade: job?.attemptsMade,
  });
});

priorityQueue.on('stalled', (job) => {
  logger.warn('Priority job stalled', {
    jobId: job.id,
    emergencyId: job.data.emergencyId,
    channel: job.data.channel,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await priorityQueue.close();
  await redisClient.quit();
  await subscriberClient.quit();
});

export { priorityQueue as default };
