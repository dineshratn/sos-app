"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEscalation = handleEscalation;
exports.scheduleEscalation = scheduleEscalation;
exports.cancelEscalation = cancelEscalation;
exports.stopFollowUpNotifications = stopFollowUpNotifications;
exports.checkAcknowledgment = checkAcknowledgment;
exports.getEscalationStatus = getEscalationStatus;
exports.cleanupAllEscalations = cleanupAllEscalations;
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const notification_service_1 = require("./notification.service");
// Track active escalation timers
const escalationTimers = new Map();
// Track follow-up intervals
const followUpIntervals = new Map();
/**
 * Handle emergency escalation to secondary contacts
 */
async function handleEscalation(data) {
    logger_1.logger.info('Handling emergency escalation', {
        emergencyId: data.emergencyId,
        secondaryContactCount: data.secondaryContacts.length,
        reason: data.escalationReason,
    });
    try {
        // Create emergency object for secondary contacts
        const emergency = {
            id: data.emergencyId,
            userId: data.userId,
            userName: data.userName,
            emergencyType: data.emergencyType,
            status: 'ACTIVE',
            location: data.location,
            initialMessage: `ESCALATED: ${data.escalationReason}`,
            contacts: data.secondaryContacts,
            createdAt: data.timestamp,
        };
        // Dispatch notifications to secondary contacts
        await (0, notification_service_1.dispatchEmergencyAlert)(emergency, data.secondaryContacts);
        // Start follow-up notifications
        startFollowUpNotifications(emergency);
        logger_1.logger.info('Escalation notifications dispatched', {
            emergencyId: data.emergencyId,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to handle escalation', {
            emergencyId: data.emergencyId,
            error: error.message,
            stack: error.stack,
        });
        throw error;
    }
}
/**
 * Schedule escalation for an emergency if primary contacts don't acknowledge
 */
function scheduleEscalation(emergency, secondaryContacts) {
    const timeoutMs = config_1.config.notification.escalationTimeout;
    logger_1.logger.info('Scheduling escalation', {
        emergencyId: emergency.id,
        timeoutMs,
    });
    // Clear any existing escalation timer
    clearEscalation(emergency.id);
    // Set escalation timer
    const timer = setTimeout(async () => {
        logger_1.logger.info('Escalation timeout reached', {
            emergencyId: emergency.id,
        });
        const escalationData = {
            emergencyId: emergency.id,
            userId: emergency.userId,
            userName: emergency.userName,
            emergencyType: emergency.emergencyType,
            location: emergency.location,
            secondaryContacts,
            escalationReason: 'Primary contacts did not acknowledge within 2 minutes',
            timestamp: new Date(),
        };
        await handleEscalation(escalationData);
    }, timeoutMs);
    escalationTimers.set(emergency.id, timer);
    logger_1.logger.info('Escalation scheduled', {
        emergencyId: emergency.id,
        timeoutMs,
    });
}
/**
 * Cancel scheduled escalation (called when primary contact acknowledges)
 */
function cancelEscalation(emergencyId) {
    clearEscalation(emergencyId);
    stopFollowUpNotifications(emergencyId);
    logger_1.logger.info('Escalation cancelled', { emergencyId });
}
/**
 * Clear escalation timer
 */
function clearEscalation(emergencyId) {
    const timer = escalationTimers.get(emergencyId);
    if (timer) {
        clearTimeout(timer);
        escalationTimers.delete(emergencyId);
        logger_1.logger.debug('Escalation timer cleared', { emergencyId });
    }
}
/**
 * Start sending follow-up notifications every 30 seconds until acknowledged
 */
function startFollowUpNotifications(emergency) {
    const intervalMs = config_1.config.notification.followupInterval;
    logger_1.logger.info('Starting follow-up notifications', {
        emergencyId: emergency.id,
        intervalMs,
    });
    // Clear any existing interval
    stopFollowUpNotifications(emergency.id);
    let followUpCount = 0;
    const maxFollowUps = 10; // Maximum 10 follow-ups (5 minutes)
    const interval = setInterval(async () => {
        followUpCount++;
        logger_1.logger.info('Sending follow-up notification', {
            emergencyId: emergency.id,
            followUpCount,
        });
        try {
            // Send follow-up notifications to all contacts
            await (0, notification_service_1.dispatchEmergencyAlert)(emergency, emergency.contacts);
            // Stop after max follow-ups
            if (followUpCount >= maxFollowUps) {
                logger_1.logger.warn('Maximum follow-ups reached', {
                    emergencyId: emergency.id,
                    followUpCount,
                });
                stopFollowUpNotifications(emergency.id);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to send follow-up notification', {
                emergencyId: emergency.id,
                followUpCount,
                error: error.message,
            });
        }
    }, intervalMs);
    followUpIntervals.set(emergency.id, interval);
}
/**
 * Stop follow-up notifications
 */
function stopFollowUpNotifications(emergencyId) {
    const interval = followUpIntervals.get(emergencyId);
    if (interval) {
        clearInterval(interval);
        followUpIntervals.delete(emergencyId);
        logger_1.logger.info('Follow-up notifications stopped', { emergencyId });
    }
}
/**
 * Check if emergency has been acknowledged
 */
async function checkAcknowledgment(emergencyId) {
    // This would query the emergency service or database to check acknowledgment status
    // For now, this is a placeholder that would need to be implemented
    // based on the actual emergency service API
    logger_1.logger.debug('Checking acknowledgment status', { emergencyId });
    // Placeholder - would make actual API call or database query
    return false;
}
/**
 * Get escalation status for an emergency
 */
function getEscalationStatus(emergencyId) {
    return {
        scheduled: escalationTimers.has(emergencyId),
        followUpActive: followUpIntervals.has(emergencyId),
    };
}
/**
 * Clean up all escalation timers and intervals
 */
function cleanupAllEscalations() {
    logger_1.logger.info('Cleaning up all escalations', {
        timerCount: escalationTimers.size,
        intervalCount: followUpIntervals.size,
    });
    // Clear all timers
    escalationTimers.forEach((timer, _emergencyId) => {
        clearTimeout(timer);
    });
    escalationTimers.clear();
    // Clear all intervals
    followUpIntervals.forEach((interval, _emergencyId) => {
        clearInterval(interval);
    });
    followUpIntervals.clear();
    logger_1.logger.info('All escalations cleaned up');
}
// Graceful shutdown
process.on('SIGTERM', cleanupAllEscalations);
process.on('SIGINT', cleanupAllEscalations);
//# sourceMappingURL=escalation.service.js.map