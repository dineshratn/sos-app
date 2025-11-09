import { logger } from '../utils/logger';
import { config } from '../config';
import { EmergencyContact, Emergency } from '../models/Notification';
import { dispatchEmergencyAlert } from './notification.service';

interface EscalationData {
  emergencyId: string;
  userId: string;
  userName: string;
  emergencyType: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  secondaryContacts: EmergencyContact[];
  escalationReason: string;
  timestamp: Date;
}

// Track active escalation timers
const escalationTimers = new Map<string, NodeJS.Timeout>();

// Track follow-up intervals
const followUpIntervals = new Map<string, NodeJS.Timeout>();

/**
 * Handle emergency escalation to secondary contacts
 */
export async function handleEscalation(data: EscalationData): Promise<void> {
  logger.info('Handling emergency escalation', {
    emergencyId: data.emergencyId,
    secondaryContactCount: data.secondaryContacts.length,
    reason: data.escalationReason,
  });

  try {
    // Create emergency object for secondary contacts
    const emergency: Emergency = {
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
    await dispatchEmergencyAlert(emergency, data.secondaryContacts);

    // Start follow-up notifications
    startFollowUpNotifications(emergency);

    logger.info('Escalation notifications dispatched', {
      emergencyId: data.emergencyId,
    });
  } catch (error: any) {
    logger.error('Failed to handle escalation', {
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
export function scheduleEscalation(
  emergency: Emergency,
  secondaryContacts: EmergencyContact[]
): void {
  const timeoutMs = config.notification.escalationTimeout;

  logger.info('Scheduling escalation', {
    emergencyId: emergency.id,
    timeoutMs,
  });

  // Clear any existing escalation timer
  clearEscalation(emergency.id);

  // Set escalation timer
  const timer = setTimeout(async () => {
    logger.info('Escalation timeout reached', {
      emergencyId: emergency.id,
    });

    const escalationData: EscalationData = {
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

  logger.info('Escalation scheduled', {
    emergencyId: emergency.id,
    timeoutMs,
  });
}

/**
 * Cancel scheduled escalation (called when primary contact acknowledges)
 */
export function cancelEscalation(emergencyId: string): void {
  clearEscalation(emergencyId);
  stopFollowUpNotifications(emergencyId);

  logger.info('Escalation cancelled', { emergencyId });
}

/**
 * Clear escalation timer
 */
function clearEscalation(emergencyId: string): void {
  const timer = escalationTimers.get(emergencyId);
  if (timer) {
    clearTimeout(timer);
    escalationTimers.delete(emergencyId);

    logger.debug('Escalation timer cleared', { emergencyId });
  }
}

/**
 * Start sending follow-up notifications every 30 seconds until acknowledged
 */
function startFollowUpNotifications(emergency: Emergency): void {
  const intervalMs = config.notification.followupInterval;

  logger.info('Starting follow-up notifications', {
    emergencyId: emergency.id,
    intervalMs,
  });

  // Clear any existing interval
  stopFollowUpNotifications(emergency.id);

  let followUpCount = 0;
  const maxFollowUps = 10; // Maximum 10 follow-ups (5 minutes)

  const interval = setInterval(async () => {
    followUpCount++;

    logger.info('Sending follow-up notification', {
      emergencyId: emergency.id,
      followUpCount,
    });

    try {
      // Send follow-up notifications to all contacts
      await dispatchEmergencyAlert(emergency, emergency.contacts);

      // Stop after max follow-ups
      if (followUpCount >= maxFollowUps) {
        logger.warn('Maximum follow-ups reached', {
          emergencyId: emergency.id,
          followUpCount,
        });
        stopFollowUpNotifications(emergency.id);
      }
    } catch (error: any) {
      logger.error('Failed to send follow-up notification', {
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
export function stopFollowUpNotifications(emergencyId: string): void {
  const interval = followUpIntervals.get(emergencyId);
  if (interval) {
    clearInterval(interval);
    followUpIntervals.delete(emergencyId);

    logger.info('Follow-up notifications stopped', { emergencyId });
  }
}

/**
 * Check if emergency has been acknowledged
 */
export async function checkAcknowledgment(emergencyId: string): Promise<boolean> {
  // This would query the emergency service or database to check acknowledgment status
  // For now, this is a placeholder that would need to be implemented
  // based on the actual emergency service API

  logger.debug('Checking acknowledgment status', { emergencyId });

  // Placeholder - would make actual API call or database query
  return false;
}

/**
 * Get escalation status for an emergency
 */
export function getEscalationStatus(emergencyId: string): {
  scheduled: boolean;
  followUpActive: boolean;
} {
  return {
    scheduled: escalationTimers.has(emergencyId),
    followUpActive: followUpIntervals.has(emergencyId),
  };
}

/**
 * Clean up all escalation timers and intervals
 */
export function cleanupAllEscalations(): void {
  logger.info('Cleaning up all escalations', {
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

  logger.info('All escalations cleaned up');
}

// Graceful shutdown
process.on('SIGTERM', cleanupAllEscalations);
process.on('SIGINT', cleanupAllEscalations);
