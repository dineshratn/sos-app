/**
 * Medical profile and health-related type definitions
 *
 * @packageDocumentation
 */

import type { UUID, Timestamp, BloodType } from './common';

/**
 * Allergy severity levels
 */
export enum AllergySeverity {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
  LIFE_THREATENING = 'LIFE_THREATENING',
}

/**
 * Medical condition severity
 */
export enum ConditionSeverity {
  CONTROLLED = 'CONTROLLED',
  MONITORING = 'MONITORING',
  ACUTE = 'ACUTE',
  CHRONIC = 'CHRONIC',
}

/**
 * Allergy information
 */
export interface Allergy {
  /** Allergy ID */
  id: UUID;
  /** Allergen name */
  allergen: string;
  /** Severity level */
  severity: AllergySeverity;
  /** Reaction description */
  reaction: string;
  /** Date diagnosed */
  diagnosedDate?: string;
}

/**
 * Medication information
 */
export interface Medication {
  /** Medication ID */
  id: UUID;
  /** Medication name */
  name: string;
  /** Dosage */
  dosage: string;
  /** Frequency (e.g., "twice daily") */
  frequency: string;
  /** What it's prescribed for */
  prescribedFor: string;
  /** Start date */
  startDate: string;
  /** End date (if applicable) */
  endDate?: string;
  /** Prescribing physician */
  prescribingPhysician?: string;
}

/**
 * Medical condition
 */
export interface MedicalCondition {
  /** Condition ID */
  id: UUID;
  /** Condition name */
  condition: string;
  /** Severity */
  severity: ConditionSeverity;
  /** Date diagnosed */
  diagnosedDate?: string;
  /** Additional notes */
  notes?: string;
}

/**
 * Physician information
 */
export interface PhysicianInfo {
  /** Physician name */
  name: string;
  /** Phone number */
  phone: string;
  /** Email */
  email?: string;
  /** Specialty */
  specialty?: string;
  /** Clinic/hospital name */
  clinicName?: string;
}

/**
 * Insurance information
 */
export interface InsuranceInfo {
  /** Insurance provider */
  provider: string;
  /** Policy number */
  policyNumber: string;
  /** Group number */
  groupNumber?: string;
  /** Member ID */
  memberId?: string;
  /** Emergency contact number for insurance */
  emergencyPhone?: string;
}

/**
 * Complete medical profile
 */
export interface MedicalProfile {
  /** Profile ID */
  id: UUID;
  /** User ID */
  userId: UUID;
  /** Blood type */
  bloodType: BloodType;
  /** Allergies */
  allergies: Allergy[];
  /** Current medications */
  medications: Medication[];
  /** Medical conditions */
  conditions: MedicalCondition[];
  /** Emergency medical notes */
  emergencyNotes?: string;
  /** Primary physician */
  primaryPhysician?: PhysicianInfo;
  /** Insurance information */
  insurance?: InsuranceInfo;
  /** Organ donor status */
  organDonor: boolean;
  /** Do not resuscitate (DNR) */
  doNotResuscitate: boolean;
  /** Creation timestamp */
  createdAt: Timestamp;
  /** Last update timestamp */
  updatedAt: Timestamp;
  /** Last reviewed timestamp */
  lastReviewedAt?: Timestamp;
}

/**
 * Medical profile creation/update DTO
 */
export interface MedicalProfileDTO {
  /** Blood type */
  bloodType?: BloodType;
  /** Emergency medical notes */
  emergencyNotes?: string;
  /** Primary physician */
  primaryPhysician?: PhysicianInfo;
  /** Insurance information */
  insurance?: InsuranceInfo;
  /** Organ donor status */
  organDonor?: boolean;
  /** Do not resuscitate */
  doNotResuscitate?: boolean;
}

/**
 * Add allergy DTO
 */
export interface AddAllergyDTO {
  /** Allergen name */
  allergen: string;
  /** Severity */
  severity: AllergySeverity;
  /** Reaction description */
  reaction: string;
  /** Diagnosed date */
  diagnosedDate?: string;
}

/**
 * Update allergy DTO
 */
export interface UpdateAllergyDTO {
  /** Allergen name */
  allergen?: string;
  /** Severity */
  severity?: AllergySeverity;
  /** Reaction description */
  reaction?: string;
  /** Diagnosed date */
  diagnosedDate?: string;
}

/**
 * Add medication DTO
 */
export interface AddMedicationDTO {
  /** Medication name */
  name: string;
  /** Dosage */
  dosage: string;
  /** Frequency */
  frequency: string;
  /** Prescribed for */
  prescribedFor: string;
  /** Start date */
  startDate: string;
  /** End date */
  endDate?: string;
  /** Prescribing physician */
  prescribingPhysician?: string;
}

/**
 * Update medication DTO
 */
export interface UpdateMedicationDTO {
  /** Medication name */
  name?: string;
  /** Dosage */
  dosage?: string;
  /** Frequency */
  frequency?: string;
  /** Prescribed for */
  prescribedFor?: string;
  /** Start date */
  startDate?: string;
  /** End date */
  endDate?: string;
  /** Prescribing physician */
  prescribingPhysician?: string;
}

/**
 * Add medical condition DTO
 */
export interface AddConditionDTO {
  /** Condition name */
  condition: string;
  /** Severity */
  severity: ConditionSeverity;
  /** Diagnosed date */
  diagnosedDate?: string;
  /** Notes */
  notes?: string;
}

/**
 * Update medical condition DTO
 */
export interface UpdateConditionDTO {
  /** Condition name */
  condition?: string;
  /** Severity */
  severity?: ConditionSeverity;
  /** Diagnosed date */
  diagnosedDate?: string;
  /** Notes */
  notes?: string;
}

/**
 * Secure medical information access link
 */
export interface MedicalAccessLink {
  /** Link ID */
  id: UUID;
  /** Token for accessing */
  token: string;
  /** User ID whose medical info this is */
  userId: UUID;
  /** Emergency ID (if applicable) */
  emergencyId?: UUID;
  /** Link URL */
  url: string;
  /** Expiration timestamp */
  expiresAt: Timestamp;
  /** Created timestamp */
  createdAt: Timestamp;
  /** Is single use */
  singleUse: boolean;
  /** Has been used */
  used: boolean;
}

/**
 * Medical information access grant
 */
export interface MedicalAccessGrant {
  /** Grant ID */
  id: UUID;
  /** User ID whose medical info this is */
  userId: UUID;
  /** User ID granted access */
  grantedTo: UUID;
  /** Granted to name */
  grantedToName: string;
  /** Grant duration in seconds */
  duration: number;
  /** Grant expiration */
  expiresAt: Timestamp;
  /** Creation timestamp */
  createdAt: Timestamp;
  /** Is revoked */
  revoked: boolean;
}

/**
 * Medical information access audit log entry
 */
export interface MedicalAccessAudit {
  /** Audit ID */
  id: UUID;
  /** User ID whose medical info was accessed */
  userId: UUID;
  /** User ID who accessed */
  accessedBy: UUID;
  /** Accessor's role */
  accessedByRole: string;
  /** Access reason */
  reason: string;
  /** IP address */
  ipAddress: string;
  /** User agent */
  userAgent: string;
  /** Access timestamp */
  timestamp: Timestamp;
  /** Emergency ID (if applicable) */
  emergencyId?: UUID;
}

/**
 * Medical emergency card (summary for first responders)
 */
export interface MedicalEmergencyCard {
  /** User full name */
  fullName: string;
  /** Date of birth */
  dateOfBirth?: string;
  /** Blood type */
  bloodType: BloodType;
  /** Critical allergies (life-threatening only) */
  criticalAllergies: string[];
  /** Critical medications */
  criticalMedications: string[];
  /** Critical conditions */
  criticalConditions: string[];
  /** Emergency notes */
  emergencyNotes?: string;
  /** DNR status */
  doNotResuscitate: boolean;
  /** Emergency contact phone */
  emergencyContactPhone?: string;
  /** Primary physician phone */
  physicianPhone?: string;
}

/**
 * Vital signs data (from IoT devices)
 */
export interface VitalSigns {
  /** Device ID */
  deviceId: UUID;
  /** User ID */
  userId: UUID;
  /** Heart rate (bpm) */
  heartRate?: number;
  /** Blood oxygen saturation (SpO2 %) */
  spO2?: number;
  /** Body temperature (Celsius) */
  temperature?: number;
  /** Blood pressure */
  bloodPressure?: BloodPressure;
  /** Timestamp */
  timestamp: Timestamp;
}

/**
 * Blood pressure reading
 */
export interface BloodPressure {
  /** Systolic pressure (mmHg) */
  systolic: number;
  /** Diastolic pressure (mmHg) */
  diastolic: number;
}

/**
 * Vital signs analysis result
 */
export interface VitalAnalysis {
  /** Detected anomalies */
  anomalies: VitalAnomaly[];
  /** Risk level */
  riskLevel: RiskLevel;
  /** Recommendation */
  recommendation: string;
  /** Should auto-trigger emergency */
  autoTrigger: boolean;
}

/**
 * Vital sign anomaly
 */
export interface VitalAnomaly {
  /** Vital type */
  type: 'HEART_RATE' | 'SPO2' | 'TEMPERATURE' | 'BLOOD_PRESSURE';
  /** Measured value */
  value: number | BloodPressure;
  /** Expected range */
  expectedRange: string;
  /** Severity */
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  /** Description */
  description: string;
}

/**
 * Risk levels
 */
export enum RiskLevel {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Medical profile privacy settings
 */
export interface MedicalPrivacySettings {
  /** User ID */
  userId: UUID;
  /** Show on lock screen */
  showOnLockScreen: boolean;
  /** Allow emergency contacts to view */
  allowEmergencyContactAccess: boolean;
  /** Allow first responders to view via link */
  allowResponderAccess: boolean;
  /** Auto-generate access link during emergency */
  autoGenerateLinkOnEmergency: boolean;
}
