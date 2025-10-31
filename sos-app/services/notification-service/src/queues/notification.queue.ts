import Queue, { Job, JobOptions } from 'bull';
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { NotificationJob, NotificationPriority } from '../models/Notification';

// Create Redis client for Bull
const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const subscriberClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Create notification queue with exponential backoff
export const notificationQueue = new Queue<NotificationJob>('notifications', {
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
          db: config.redis.db,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        });
      default:
        return new Redis({
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          db: config.redis.db,
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
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs
  },
  settings: {
    stalledInterval: 30000, // Check for stalled jobs every 30s
    maxStalledCount: 2, // Retry stalled jobs twice
  },
});

// Job priority mapping
const priorityToDelay: Record<NotificationPriority, number> = {
  [NotificationPriority.EMERGENCY]: 0, // Immediate
  [NotificationPriority.HIGH]: 100, // 100ms delay
  [NotificationPriority.NORMAL]: 500, // 500ms delay
  [NotificationPriority.LOW]: 2000, // 2s delay
};

/**
 * Add a notification job to the queue
 */
export async function addNotificationJob(
  jobData: NotificationJob,
  options?: Partial<JobOptions>
): Promise<Job<NotificationJob>> {
  const delay = priorityToDelay[jobData.priority] || 0;

  const job = await notificationQueue.add(jobData, {
    ...options,
    delay,
    priority: getPriorityValue(jobData.priority),
    jobId: `${jobData.emergencyId}-${jobData.recipientId}-${jobData.channel}-${Date.now()}`,
  });

  logger.info('Notification job added to queue', {
    jobId: job.id,
    emergencyId: jobData.emergencyId,
    recipientId: jobData.recipientId,
    channel: jobData.channel,
    priority: jobData.priority,
  });

  return job;
}

/**
 * Add multiple notification jobs in bulk
 */
export async function addBulkNotificationJobs(
  jobs: NotificationJob[]
): Promise<Job<NotificationJob>[]> {
  const bulkJobs = jobs.map((jobData) => ({
    name: 'notification',
    data: jobData,
    opts: {
      delay: priorityToDelay[jobData.priority] || 0,
      priority: getPriorityValue(jobData.priority),
      jobId: `${jobData.emergencyId}-${jobData.recipientId}-${jobData.channel}-${Date.now()}`,
    },
  }));

  const addedJobs = await notificationQueue.addBulk(bulkJobs);

  logger.info('Bulk notification jobs added to queue', {
    count: addedJobs.length,
  });

  return addedJobs;
}

/**
 * Convert priority enum to numeric value for Bull queue
 */
function getPriorityValue(priority: NotificationPriority): number {
  switch (priority) {
    case NotificationPriority.EMERGENCY:
      return 1; // Highest priority
    case NotificationPriority.HIGH:
      return 2;
    case NotificationPriority.NORMAL:
      return 3;
    case NotificationPriority.LOW:
      return 4; // Lowest priority
    default:
      return 3;
  }
}

/**
 * Get job counts by status
 */
export async function getJobCounts() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    notificationQueue.getWaitingCount(),
    notificationQueue.getActiveCount(),
    notificationQueue.getCompletedCount(),
    notificationQueue.getFailedCount(),
    notificationQueue.getDelayedCount(),
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
 * Clean old jobs
 */
export async function cleanOldJobs(
  grace: number = 24 * 60 * 60 * 1000 // 24 hours
): Promise<void> {
  await notificationQueue.clean(grace, 'completed');
  await notificationQueue.clean(grace, 'failed');
  logger.info('Cleaned old jobs from queue', { graceMs: grace });
}

// Event listeners for monitoring
notificationQueue.on('error', (error) => {
  logger.error('Queue error', { error: error.message, stack: error.stack });
});

notificationQueue.on('waiting', (jobId) => {
  logger.debug('Job waiting', { jobId });
});

notificationQueue.on('active', (job) => {
  logger.debug('Job active', {
    jobId: job.id,
    emergencyId: job.data.emergencyId,
    channel: job.data.channel,
  });
});

notificationQueue.on('completed', (job, result) => {
  logger.info('Job completed', {
    jobId: job.id,
    emergencyId: job.data.emergencyId,
    channel: job.data.channel,
    result,
  });
});

notificationQueue.on('failed', (job, error) => {
  logger.error('Job failed', {
    jobId: job?.id,
    emergencyId: job?.data?.emergencyId,
    channel: job?.data?.channel,
    error: error.message,
    attemptsMade: job?.attemptsMade,
  });
});

notificationQueue.on('stalled', (job) => {
  logger.warn('Job stalled', {
    jobId: job.id,
    emergencyId: job.data.emergencyId,
    channel: job.data.channel,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await notificationQueue.close();
  await redisClient.quit();
  await subscriberClient.quit();
});

export { notificationQueue as default };
