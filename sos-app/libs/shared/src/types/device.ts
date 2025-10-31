/**
 * IoT device and wearable integration type definitions
 *
 * @packageDocumentation
 */

import type { UUID, Timestamp, Location } from './common';
import type { VitalSigns, VitalAnalysis, BloodPressure } from './medical';

/**
 * Device types
 */
export enum DeviceType {
  WEARABLE = 'WEARABLE',
  PANIC_BUTTON = 'PANIC_BUTTON',
  SMARTWATCH = 'SMARTWATCH',
  FITNESS_TRACKER = 'FITNESS_TRACKER',
}

/**
 * Device status
 */
export enum DeviceStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  LOW_BATTERY = 'LOW_BATTERY',
  DISCONNECTED = 'DISCONNECTED',
}

/**
 * Device capabilities
 */
export enum DeviceCapability {
  FALL_DETECTION = 'FALL_DETECTION',
  HEART_RATE = 'HEART_RATE',
  GPS = 'GPS',
  SOS_BUTTON = 'SOS_BUTTON',
  SPO2 = 'SPO2',
  TEMPERATURE = 'TEMPERATURE',
  BLOOD_PRESSURE = 'BLOOD_PRESSURE',
  ACCELEROMETER = 'ACCELEROMETER',
  GYROSCOPE = 'GYROSCOPE',
}

/**
 * IoT device record
 */
export interface Device {
  /** Device ID */
  id: UUID;
  /** User ID who owns the device */
  userId: UUID;
  /** Device type */
  deviceType: DeviceType;
  /** Manufacturer */
  manufacturer?: string;
  /** Model */
  model?: string;
  /** Firmware version */
  firmwareVersion?: string;
  /** MAC address */
  macAddress?: string;
  /** Serial number */
  serialNumber?: string;
  /** Pairing timestamp */
  pairedAt: Timestamp;
  /** Last seen timestamp */
  lastSeenAt?: Timestamp;
  /** Battery level (0-100) */
  batteryLevel?: number;
  /** Device status */
  status: DeviceStatus;
  /** Device settings */
  settings: DeviceSettings;
  /** Device capabilities */
  capabilities: DeviceCapability[];
}

/**
 * Device settings
 */
export interface DeviceSettings {
  /** Device name/label */
  name?: string;
  /** Fall detection enabled */
  fallDetectionEnabled: boolean;
  /** Fall detection sensitivity (0-1) */
  fallDetectionSensitivity: number;
  /** Heart rate monitoring enabled */
  heartRateMonitoringEnabled: boolean;
  /** Heart rate alert thresholds */
  heartRateThresholds?: {
    /** Minimum safe heart rate */
    min: number;
    /** Maximum safe heart rate */
    max: number;
  };
  /** Auto-trigger emergency on anomaly */
  autoTriggerOnAnomaly: boolean;
  /** Location tracking enabled */
  locationTrackingEnabled: boolean;
  /** Battery alert threshold (%) */
  batteryAlertThreshold: number;
}

/**
 * Device pairing request
 */
export interface PairDeviceDTO {
  /** Device type */
  deviceType: DeviceType;
  /** Manufacturer */
  manufacturer?: string;
  /** Model */
  model?: string;
  /** MAC address */
  macAddress: string;
  /** Serial number */
  serialNumber?: string;
  /** Device capabilities */
  capabilities: DeviceCapability[];
}

/**
 * Device settings update request
 */
export interface UpdateDeviceSettingsDTO {
  /** Device name */
  name?: string;
  /** Fall detection enabled */
  fallDetectionEnabled?: boolean;
  /** Fall detection sensitivity */
  fallDetectionSensitivity?: number;
  /** Heart rate monitoring enabled */
  heartRateMonitoringEnabled?: boolean;
  /** Heart rate thresholds */
  heartRateThresholds?: {
    min: number;
    max: number;
  };
  /** Auto-trigger on anomaly */
  autoTriggerOnAnomaly?: boolean;
  /** Location tracking enabled */
  locationTrackingEnabled?: boolean;
  /** Battery alert threshold */
  batteryAlertThreshold?: number;
}

/**
 * Device event types
 */
export enum DeviceEventType {
  FALL_DETECTED = 'FALL_DETECTED',
  SOS_BUTTON_PRESSED = 'SOS_BUTTON_PRESSED',
  HEART_RATE_ANOMALY = 'HEART_RATE_ANOMALY',
  SPO2_ANOMALY = 'SPO2_ANOMALY',
  TEMPERATURE_ANOMALY = 'TEMPERATURE_ANOMALY',
  LOW_BATTERY = 'LOW_BATTERY',
  DEVICE_DISCONNECTED = 'DEVICE_DISCONNECTED',
  DEVICE_RECONNECTED = 'DEVICE_RECONNECTED',
}

/**
 * Device event
 */
export interface DeviceEvent {
  /** Event ID */
  id: UUID;
  /** Device ID */
  deviceId: UUID;
  /** User ID */
  userId: UUID;
  /** Event type */
  eventType: DeviceEventType;
  /** Event payload/data */
  payload: Record<string, unknown>;
  /** Event timestamp */
  timestamp: Timestamp;
  /** Confidence level (for ML-based detections, 0-1) */
  confidence?: number;
  /** Location when event occurred */
  location?: Location;
}

/**
 * Fall detection event data
 */
export interface FallDetectionEvent {
  /** Event ID */
  id: UUID;
  /** Device ID */
  deviceId: UUID;
  /** User ID */
  userId: UUID;
  /** Detection timestamp */
  timestamp: Timestamp;
  /** Confidence score (0-1) */
  confidence: number;
  /** Location */
  location?: Location;
  /** Sensor data */
  sensorData: {
    /** Acceleration vector */
    acceleration: {
      x: number;
      y: number;
      z: number;
    };
    /** Impact force (g) */
    impactForce: number;
    /** Orientation change (degrees) */
    orientationChange?: number;
  };
  /** User responded to alert */
  userResponded: boolean;
  /** Response time (seconds) */
  responseTime?: number;
}

/**
 * Device telemetry data
 */
export interface DeviceTelemetry {
  /** Device ID */
  deviceId: UUID;
  /** Battery level */
  batteryLevel: number;
  /** Signal strength (dBm or percentage) */
  signalStrength?: number;
  /** Connection type */
  connectionType: 'BLUETOOTH' | 'WIFI' | 'CELLULAR';
  /** Firmware version */
  firmwareVersion: string;
  /** Uptime (seconds) */
  uptime: number;
  /** Timestamp */
  timestamp: Timestamp;
}

/**
 * Device status report
 */
export interface DeviceStatusReport {
  /** Device information */
  device: Device;
  /** Current status */
  status: DeviceStatus;
  /** Battery level */
  batteryLevel: number;
  /** Last connection time */
  lastConnectedAt: Timestamp;
  /** Connection duration (seconds) */
  connectionDuration: number;
  /** Latest telemetry */
  telemetry?: DeviceTelemetry;
  /** Latest vital signs */
  latestVitals?: VitalSigns;
  /** Health check result */
  healthCheck: DeviceHealthCheck;
}

/**
 * Device health check
 */
export interface DeviceHealthCheck {
  /** Is healthy */
  healthy: boolean;
  /** Issues detected */
  issues: DeviceIssue[];
  /** Recommendations */
  recommendations: string[];
  /** Last check timestamp */
  lastCheckAt: Timestamp;
}

/**
 * Device issue
 */
export interface DeviceIssue {
  /** Issue code */
  code: string;
  /** Severity */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Description */
  description: string;
  /** Suggested action */
  suggestedAction?: string;
}

/**
 * Battery status
 */
export interface BatteryStatus {
  /** Device ID */
  deviceId: UUID;
  /** Battery level (0-100) */
  level: number;
  /** Is charging */
  isCharging: boolean;
  /** Estimated time to full charge (seconds) */
  timeToFullCharge?: number;
  /** Estimated time remaining (seconds) */
  timeRemaining?: number;
  /** Battery health (0-100) */
  health?: number;
  /** Timestamp */
  timestamp: Timestamp;
}

/**
 * MQTT topic structure for device communication
 */
export interface MQTTTopics {
  /** Device telemetry topic */
  telemetry: `devices/${string}/telemetry`;
  /** Device events topic */
  events: `devices/${string}/events`;
  /** Device commands topic */
  commands: `devices/${string}/commands`;
  /** Device status topic */
  status: `devices/${string}/status`;
}

/**
 * Device command types
 */
export enum DeviceCommand {
  START_MONITORING = 'START_MONITORING',
  STOP_MONITORING = 'STOP_MONITORING',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',
  TRIGGER_EMERGENCY = 'TRIGGER_EMERGENCY',
  REQUEST_STATUS = 'REQUEST_STATUS',
  UPDATE_FIRMWARE = 'UPDATE_FIRMWARE',
}

/**
 * Device command message
 */
export interface DeviceCommandMessage {
  /** Command type */
  command: DeviceCommand;
  /** Command parameters */
  parameters?: Record<string, unknown>;
  /** Command ID for tracking */
  commandId: UUID;
  /** Timestamp */
  timestamp: Timestamp;
}

/**
 * Device firmware update
 */
export interface FirmwareUpdate {
  /** Update ID */
  id: UUID;
  /** Device ID */
  deviceId: UUID;
  /** Current firmware version */
  currentVersion: string;
  /** Target firmware version */
  targetVersion: string;
  /** Update status */
  status: FirmwareUpdateStatus;
  /** Update progress (0-100) */
  progress: number;
  /** Started timestamp */
  startedAt: Timestamp;
  /** Completed timestamp */
  completedAt?: Timestamp;
  /** Error message if failed */
  error?: string;
}

/**
 * Firmware update status
 */
export enum FirmwareUpdateStatus {
  PENDING = 'PENDING',
  DOWNLOADING = 'DOWNLOADING',
  INSTALLING = 'INSTALLING',
  VERIFYING = 'VERIFYING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/**
 * Device analytics
 */
export interface DeviceAnalytics {
  /** Device ID */
  deviceId: UUID;
  /** Time period */
  period: {
    start: Timestamp;
    end: Timestamp;
  };
  /** Total uptime (seconds) */
  totalUptime: number;
  /** Average battery level */
  averageBatteryLevel: number;
  /** Connection reliability (%) */
  connectionReliability: number;
  /** Number of events */
  eventCount: number;
  /** Events by type */
  eventsByType: Record<DeviceEventType, number>;
  /** Fall detection accuracy (if applicable) */
  fallDetectionAccuracy?: {
    truePositives: number;
    falsePositives: number;
    accuracy: number;
  };
}

/**
 * Device notification preferences
 */
export interface DeviceNotificationPreferences {
  /** User ID */
  userId: UUID;
  /** Notify on low battery */
  notifyOnLowBattery: boolean;
  /** Notify on disconnection */
  notifyOnDisconnection: boolean;
  /** Notify on fall detection */
  notifyOnFallDetection: boolean;
  /** Notify on vital anomaly */
  notifyOnVitalAnomaly: boolean;
  /** Notification channels */
  channels: ('PUSH' | 'SMS' | 'EMAIL')[];
}
