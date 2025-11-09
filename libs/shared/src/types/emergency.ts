/**
 * Emergency-related type definitions
 *
 * @packageDocumentation
 */

import type { UUID, Timestamp, EmergencyType, EmergencyStatus, Location } from './common';
import type { EmergencyContact } from './user';

/**
 * Emergency alert record
 */
export interface Emergency {
  /** Emergency ID */
  id: UUID;
  /** User ID who triggered the emergency */
  userId: UUID;
  /** Type of emergency */
  emergencyType: EmergencyType;
  /** Current status */
  status: EmergencyStatus;
  /** Initial location when triggered */
  initialLocation: Location;
  /** User's initial message/description */
  initialMessage?: string;
  /** Was this auto-triggered by a device */
  autoTriggered: boolean;
  /** What triggered it (user, device ID, or system) */
  triggeredBy: string;
  /** Countdown duration in seconds */
  countdownSeconds: number;
  /** Emergency creation timestamp */
  createdAt: Timestamp;
  /** When emergency was activated (after countdown) */
  activatedAt?: Timestamp;
  /** When emergency was cancelled */
  cancelledAt?: Timestamp;
  /** When emergency was resolved */
  resolvedAt?: Timestamp;
  /** Resolution notes */
  resolutionNotes?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Emergency trigger request
 */
export interface TriggerEmergencyDTO {
  /** Type of emergency */
  emergencyType: EmergencyType;
  /** Current location */
  location: Location;
  /** Optional message */
  message?: string;
  /** Countdown duration override (seconds) */
  countdownSeconds?: number;
}

/**
 * Auto-trigger emergency request (from IoT devices)
 */
export interface AutoTriggerEmergencyDTO {
  /** Type of emergency */
  emergencyType: EmergencyType;
  /** Current location */
  location: Location;
  /** Device ID that triggered it */
  deviceId: UUID;
  /** Confidence level (0-1) for ML-based detections */
  confidence?: number;
  /** Sensor data or context */
  context?: Record<string, unknown>;
}

/**
 * Emergency cancellation request
 */
export interface CancelEmergencyDTO {
  /** Emergency ID */
  emergencyId: UUID;
  /** Cancellation reason */
  reason?: string;
}

/**
 * Emergency resolution request
 */
export interface ResolveEmergencyDTO {
  /** Emergency ID */
  emergencyId: UUID;
  /** Resolution notes */
  notes?: string;
  /** Final outcome */
  outcome?: EmergencyOutcome;
}

/**
 * Emergency outcome types
 */
export enum EmergencyOutcome {
  RESOLVED_SAFELY = 'RESOLVED_SAFELY',
  ASSISTANCE_PROVIDED = 'ASSISTANCE_PROVIDED',
  FALSE_ALARM = 'FALSE_ALARM',
  TRANSFERRED_TO_SERVICES = 'TRANSFERRED_TO_SERVICES',
  OTHER = 'OTHER',
}

/**
 * Emergency acknowledgment record
 */
export interface EmergencyAcknowledgment {
  /** Acknowledgment ID */
  id: UUID;
  /** Emergency ID */
  emergencyId: UUID;
  /** Contact ID who acknowledged */
  contactId: UUID;
  /** Contact's name */
  contactName: string;
  /** Acknowledgment timestamp */
  acknowledgedAt: Timestamp;
  /** Contact's location when acknowledging */
  location?: Location;
  /** Optional message from contact */
  message?: string;
}

/**
 * Emergency acknowledgment request
 */
export interface AcknowledgeEmergencyDTO {
  /** Emergency ID */
  emergencyId: UUID;
  /** Optional message */
  message?: string;
  /** Contact's current location */
  location?: Location;
}

/**
 * Contact status during emergency
 */
export interface ContactStatus {
  /** Contact information */
  contact: EmergencyContact;
  /** Has this contact acknowledged */
  acknowledged: boolean;
  /** Acknowledgment details if acknowledged */
  acknowledgment?: EmergencyAcknowledgment;
  /** Notification delivery status */
  notified: boolean;
  /** When contact was notified */
  notifiedAt?: Timestamp;
}

/**
 * Emergency with full context (for emergency contacts/responders)
 */
export interface EmergencyDetails extends Emergency {
  /** User's full name */
  userName: string;
  /** User's profile picture */
  userProfilePicture?: string;
  /** User's phone number */
  userPhoneNumber?: string;
  /** Current location (latest) */
  currentLocation?: Location;
  /** Location trail */
  locationTrail: LocationPoint[];
  /** Contact acknowledgments */
  acknowledgments: EmergencyAcknowledgment[];
  /** Messages in emergency chat */
  messages: EmergencyMessage[];
  /** Medical information access link */
  medicalInfoLink?: string;
}

/**
 * Location point in emergency trail
 */
export interface LocationPoint {
  /** Location data */
  location: Location;
  /** Timestamp */
  timestamp: Timestamp;
  /** Provider */
  provider: string;
  /** Battery level at this point */
  batteryLevel?: number;
}

/**
 * Emergency message (chat during emergency)
 */
export interface EmergencyMessage {
  /** Message ID */
  id: UUID;
  /** Emergency ID */
  emergencyId: UUID;
  /** Sender ID */
  senderId: UUID;
  /** Sender name */
  senderName: string;
  /** Sender role */
  senderRole: 'USER' | 'CONTACT' | 'RESPONDER';
  /** Message type */
  type: MessageType;
  /** Message content */
  content: string;
  /** Additional metadata */
  metadata?: MessageMetadata;
  /** Creation timestamp */
  createdAt: Timestamp;
  /** Edit timestamp */
  editedAt?: Timestamp;
  /** Deletion timestamp */
  deletedAt?: Timestamp;
}

/**
 * Message types
 */
export enum MessageType {
  TEXT = 'TEXT',
  VOICE = 'VOICE',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  LOCATION = 'LOCATION',
  QUICK_RESPONSE = 'QUICK_RESPONSE',
}

/**
 * Message metadata
 */
export interface MessageMetadata {
  /** Media URL */
  mediaUrl?: string;
  /** Thumbnail URL */
  thumbnailUrl?: string;
  /** Voice transcription */
  transcription?: string;
  /** Duration in seconds (for voice/video) */
  duration?: number;
  /** File size in bytes */
  fileSize?: number;
  /** MIME type */
  mimeType?: string;
  /** Location data (for location messages) */
  location?: Location;
  /** Quick response type */
  quickResponseType?: QuickResponseType;
}

/**
 * Quick response button types
 */
export enum QuickResponseType {
  NEED_AMBULANCE = 'NEED_AMBULANCE',
  NEED_POLICE = 'NEED_POLICE',
  NEED_FIRE = 'NEED_FIRE',
  TRAPPED = 'TRAPPED',
  INJURED = 'INJURED',
  SAFE_NOW = 'SAFE_NOW',
  CALL_ME = 'CALL_ME',
}

/**
 * Send message request
 */
export interface SendMessageDTO {
  /** Emergency ID */
  emergencyId: UUID;
  /** Message type */
  type: MessageType;
  /** Message content */
  content: string;
  /** Metadata */
  metadata?: MessageMetadata;
}

/**
 * Emergency history filters
 */
export interface EmergencyHistoryFilters {
  /** Filter by emergency type */
  type?: EmergencyType;
  /** Filter by status */
  status?: EmergencyStatus;
  /** Start date */
  startDate?: Timestamp;
  /** End date */
  endDate?: Timestamp;
  /** Search query */
  search?: string;
}

/**
 * Emergency report export format
 */
export enum ExportFormat {
  PDF = 'PDF',
  JSON = 'JSON',
  CSV = 'CSV',
}

/**
 * Emergency report export request
 */
export interface ExportEmergencyReportDTO {
  /** Emergency ID */
  emergencyId: UUID;
  /** Export format */
  format: ExportFormat;
  /** Include location trail */
  includeLocationTrail?: boolean;
  /** Include messages */
  includeMessages?: boolean;
  /** Include medical information */
  includeMedicalInfo?: boolean;
}

/**
 * Emergency statistics
 */
export interface EmergencyStats {
  /** Total emergencies */
  total: number;
  /** Active emergencies */
  active: number;
  /** Resolved emergencies */
  resolved: number;
  /** Cancelled emergencies */
  cancelled: number;
  /** Average response time (seconds) */
  averageResponseTime: number;
  /** Average resolution time (seconds) */
  averageResolutionTime: number;
  /** Breakdown by type */
  byType: Record<EmergencyType, number>;
}

/**
 * Emergency notification preferences
 */
export interface EmergencyNotificationPreferences {
  /** User ID */
  userId: UUID;
  /** Notify emergency services automatically */
  notifyEmergencyServices: boolean;
  /** Countdown duration in seconds */
  countdownDuration: number;
  /** Escalation delay in seconds */
  escalationDelay: number;
  /** Follow-up interval in seconds */
  followUpInterval: number;
}
