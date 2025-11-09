"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.notificationQueue = void 0;
exports.addNotificationJob = addNotificationJob;
exports.addBulkNotificationJobs = addBulkNotificationJobs;
exports.getJobCounts = getJobCounts;
exports.cleanOldJobs = cleanOldJobs;
const bull_1 = __importDefault(require("bull"));
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const Notification_1 = require("../models/Notification");
// Create Redis client for Bull
const redisClient = new ioredis_1.default({
    host: config_1.config.redis.host,
    port: config_1.config.redis.port,
    password: config_1.config.redis.password,
    db: config_1.config.redis.db,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});
const subscriberClient = new ioredis_1.default({
    host: config_1.config.redis.host,
    port: config_1.config.redis.port,
    password: config_1.config.redis.password,
    db: config_1.config.redis.db,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});
// Create notification queue with exponential backoff
exports.notificationQueue = new bull_1.default('notifications', {
    createClient: (type) => {
        switch (type) {
            case 'client':
                return redisClient;
            case 'subscriber':
                return subscriberClient;
            case 'bclient':
                return new ioredis_1.default({
                    host: config_1.config.redis.host,
                    port: config_1.config.redis.port,
                    password: config_1.config.redis.password,
                    db: config_1.config.redis.db,
                    maxRetriesPerRequest: null,
                    enableReadyCheck: false,
                });
            default:
                return new ioredis_1.default({
                    host: config_1.config.redis.host,
                    port: config_1.config.redis.port,
                    password: config_1.config.redis.password,
                    db: config_1.config.redis.db,
                    maxRetriesPerRequest: null,
                    enableReadyCheck: false,
                });
        }
    },
    defaultJobOptions: {
        attempts: config_1.config.notification.retryAttempts,
        backoff: {
            type: 'exponential',
            delay: config_1.config.notification.initialRetryDelay,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500, // Keep last 500 failed jobs
    },
    settings: {
        stalledInterval: 30000, // Check for stalled jobs every 30s
        maxStalledCount: 2, // Retry stalled jobs twice
    },
});
exports.default = exports.notificationQueue;
// Job priority mapping
const priorityToDelay = {
    [Notification_1.NotificationPriority.EMERGENCY]: 0, // Immediate
    [Notification_1.NotificationPriority.HIGH]: 100, // 100ms delay
    [Notification_1.NotificationPriority.NORMAL]: 500, // 500ms delay
    [Notification_1.NotificationPriority.LOW]: 2000, // 2s delay
};
/**
 * Add a notification job to the queue
 */
async function addNotificationJob(jobData, options) {
    const delay = priorityToDelay[jobData.priority] || 0;
    const job = await exports.notificationQueue.add(jobData, {
        ...options,
        delay,
        priority: getPriorityValue(jobData.priority),
        jobId: `${jobData.emergencyId}-${jobData.recipientId}-${jobData.channel}-${Date.now()}`,
    });
    logger_1.logger.info('Notification job added to queue', {
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
async function addBulkNotificationJobs(jobs) {
    const bulkJobs = jobs.map((jobData) => ({
        name: 'notification',
        data: jobData,
        opts: {
            delay: priorityToDelay[jobData.priority] || 0,
            priority: getPriorityValue(jobData.priority),
            jobId: `${jobData.emergencyId}-${jobData.recipientId}-${jobData.channel}-${Date.now()}`,
        },
    }));
    const addedJobs = await exports.notificationQueue.addBulk(bulkJobs);
    logger_1.logger.info('Bulk notification jobs added to queue', {
        count: addedJobs.length,
    });
    return addedJobs;
}
/**
 * Convert priority enum to numeric value for Bull queue
 */
function getPriorityValue(priority) {
    switch (priority) {
        case Notification_1.NotificationPriority.EMERGENCY:
            return 1; // Highest priority
        case Notification_1.NotificationPriority.HIGH:
            return 2;
        case Notification_1.NotificationPriority.NORMAL:
            return 3;
        case Notification_1.NotificationPriority.LOW:
            return 4; // Lowest priority
        default:
            return 3;
    }
}
/**
 * Get job counts by status
 */
async function getJobCounts() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
        exports.notificationQueue.getWaitingCount(),
        exports.notificationQueue.getActiveCount(),
        exports.notificationQueue.getCompletedCount(),
        exports.notificationQueue.getFailedCount(),
        exports.notificationQueue.getDelayedCount(),
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
async function cleanOldJobs(grace = 24 * 60 * 60 * 1000 // 24 hours
) {
    await exports.notificationQueue.clean(grace, 'completed');
    await exports.notificationQueue.clean(grace, 'failed');
    logger_1.logger.info('Cleaned old jobs from queue', { graceMs: grace });
}
// Event listeners for monitoring
exports.notificationQueue.on('error', (error) => {
    logger_1.logger.error('Queue error', { error: error.message, stack: error.stack });
});
exports.notificationQueue.on('waiting', (jobId) => {
    logger_1.logger.debug('Job waiting', { jobId });
});
exports.notificationQueue.on('active', (job) => {
    logger_1.logger.debug('Job active', {
        jobId: job.id,
        emergencyId: job.data.emergencyId,
        channel: job.data.channel,
    });
});
exports.notificationQueue.on('completed', (job, result) => {
    logger_1.logger.info('Job completed', {
        jobId: job.id,
        emergencyId: job.data.emergencyId,
        channel: job.data.channel,
        result,
    });
});
exports.notificationQueue.on('failed', (job, error) => {
    logger_1.logger.error('Job failed', {
        jobId: job?.id,
        emergencyId: job?.data?.emergencyId,
        channel: job?.data?.channel,
        error: error.message,
        attemptsMade: job?.attemptsMade,
    });
});
exports.notificationQueue.on('stalled', (job) => {
    logger_1.logger.warn('Job stalled', {
        jobId: job.id,
        emergencyId: job.data.emergencyId,
        channel: job.data.channel,
    });
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    await exports.notificationQueue.close();
    await redisClient.quit();
    await subscriberClient.quit();
});
//# sourceMappingURL=notification.queue.js.map