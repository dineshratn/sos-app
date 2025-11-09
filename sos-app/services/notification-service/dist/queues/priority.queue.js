"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.priorityQueue = void 0;
exports.addPriorityNotification = addPriorityNotification;
exports.addBulkPriorityNotifications = addBulkPriorityNotifications;
exports.shouldUsePriorityQueue = shouldUsePriorityQueue;
exports.routeNotification = routeNotification;
exports.getPriorityQueueStats = getPriorityQueueStats;
exports.pausePriorityQueue = pausePriorityQueue;
exports.resumePriorityQueue = resumePriorityQueue;
exports.cleanPriorityQueueJobs = cleanPriorityQueueJobs;
const bull_1 = __importDefault(require("bull"));
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const Notification_1 = require("../models/Notification");
/**
 * Priority queue for high-priority emergency notifications
 * This queue has higher concurrency and processes jobs faster than regular queue
 */
// Create Redis client for priority queue
const redisClient = new ioredis_1.default({
    host: config_1.config.redis.host,
    port: config_1.config.redis.port,
    password: config_1.config.redis.password,
    db: config_1.config.redis.db + 1, // Use different DB for priority queue
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});
const subscriberClient = new ioredis_1.default({
    host: config_1.config.redis.host,
    port: config_1.config.redis.port,
    password: config_1.config.redis.password,
    db: config_1.config.redis.db + 1,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});
// Create priority queue with faster processing
exports.priorityQueue = new bull_1.default('priority-notifications', {
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
                    db: config_1.config.redis.db + 1,
                    maxRetriesPerRequest: null,
                    enableReadyCheck: false,
                });
            default:
                return new ioredis_1.default({
                    host: config_1.config.redis.host,
                    port: config_1.config.redis.port,
                    password: config_1.config.redis.password,
                    db: config_1.config.redis.db + 1,
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
exports.default = exports.priorityQueue;
/**
 * Add emergency notification to priority queue
 */
async function addPriorityNotification(jobData, options) {
    const job = await exports.priorityQueue.add(jobData, {
        ...options,
        delay: 0, // Process immediately
        priority: 1, // Highest priority
        jobId: `priority-${jobData.emergencyId}-${jobData.recipientId}-${jobData.channel}-${Date.now()}`,
    });
    logger_1.logger.info('Priority notification job added to queue', {
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
async function addBulkPriorityNotifications(jobs) {
    const bulkJobs = jobs.map((jobData) => ({
        name: 'priority-notification',
        data: jobData,
        opts: {
            delay: 0,
            priority: 1,
            jobId: `priority-${jobData.emergencyId}-${jobData.recipientId}-${jobData.channel}-${Date.now()}`,
        },
    }));
    const addedJobs = await exports.priorityQueue.addBulk(bulkJobs);
    logger_1.logger.info('Bulk priority notification jobs added to queue', {
        count: addedJobs.length,
    });
    return addedJobs;
}
/**
 * Check if notification should use priority queue
 */
function shouldUsePriorityQueue(jobData) {
    // Use priority queue for:
    // 1. Emergency priority notifications
    // 2. High priority notifications
    // 3. Primary contacts
    return (jobData.priority === Notification_1.NotificationPriority.EMERGENCY ||
        jobData.priority === Notification_1.NotificationPriority.HIGH);
}
/**
 * Route notification to appropriate queue
 */
async function routeNotification(jobData, options) {
    if (shouldUsePriorityQueue(jobData)) {
        return await addPriorityNotification(jobData, options);
    }
    else {
        // Import regular queue dynamically to avoid circular dependency
        const { addNotificationJob } = await Promise.resolve().then(() => __importStar(require('./notification.queue')));
        return await addNotificationJob(jobData, options);
    }
}
/**
 * Get priority queue statistics
 */
async function getPriorityQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
        exports.priorityQueue.getWaitingCount(),
        exports.priorityQueue.getActiveCount(),
        exports.priorityQueue.getCompletedCount(),
        exports.priorityQueue.getFailedCount(),
        exports.priorityQueue.getDelayedCount(),
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
async function pausePriorityQueue() {
    await exports.priorityQueue.pause();
    logger_1.logger.info('Priority queue paused');
}
/**
 * Resume priority queue
 */
async function resumePriorityQueue() {
    await exports.priorityQueue.resume();
    logger_1.logger.info('Priority queue resumed');
}
/**
 * Clean old jobs
 */
async function cleanPriorityQueueJobs(grace = 12 * 60 * 60 * 1000 // 12 hours
) {
    await exports.priorityQueue.clean(grace, 'completed');
    await exports.priorityQueue.clean(grace, 'failed');
    logger_1.logger.info('Cleaned old jobs from priority queue', { graceMs: grace });
}
// Event listeners for monitoring
exports.priorityQueue.on('error', (error) => {
    logger_1.logger.error('Priority queue error', { error: error.message, stack: error.stack });
});
exports.priorityQueue.on('waiting', (jobId) => {
    logger_1.logger.debug('Priority job waiting', { jobId });
});
exports.priorityQueue.on('active', (job) => {
    logger_1.logger.debug('Priority job active', {
        jobId: job.id,
        emergencyId: job.data.emergencyId,
        channel: job.data.channel,
    });
});
exports.priorityQueue.on('completed', (job, result) => {
    logger_1.logger.info('Priority job completed', {
        jobId: job.id,
        emergencyId: job.data.emergencyId,
        channel: job.data.channel,
        result,
    });
});
exports.priorityQueue.on('failed', (job, error) => {
    logger_1.logger.error('Priority job failed', {
        jobId: job?.id,
        emergencyId: job?.data?.emergencyId,
        channel: job?.data?.channel,
        error: error.message,
        attemptsMade: job?.attemptsMade,
    });
});
exports.priorityQueue.on('stalled', (job) => {
    logger_1.logger.warn('Priority job stalled', {
        jobId: job.id,
        emergencyId: job.data.emergencyId,
        channel: job.data.channel,
    });
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    await exports.priorityQueue.close();
    await redisClient.quit();
    await subscriberClient.quit();
});
//# sourceMappingURL=priority.queue.js.map