/**
 * User-related type definitions
 *
 * @packageDocumentation
 */

import type { UUID, Timestamp, AuthProvider, UserRole, ContactPriority } from './common';

/**
 * User account information
 */
export interface User {
  /** Unique user ID */
  id: UUID;
  /** Email address */
  email: string;
  /** Phone number in international format */
  phoneNumber?: string;
  /** Authentication provider */
  authProvider: AuthProvider;
  /** Provider-specific user ID */
  providerId?: string;
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Profile picture URL */
  profilePictureUrl?: string;
  /** Date of birth */
  dateOfBirth?: string;
  /** Multi-factor authentication enabled */
  mfaEnabled: boolean;
  /** Account creation timestamp */
  createdAt: Timestamp;
  /** Last update timestamp */
  updatedAt: Timestamp;
  /** Last login timestamp */
  lastLoginAt?: Timestamp;
  /** Soft delete timestamp */
  deletedAt?: Timestamp;
}

/**
 * User registration data transfer object
 */
export interface RegisterDTO {
  /** Email address */
  email: string;
  /** Password (for local auth) */
  password?: string;
  /** Phone number */
  phoneNumber?: string;
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Date of birth */
  dateOfBirth?: string;
  /** Authentication provider */
  authProvider: AuthProvider;
  /** Provider token (for social auth) */
  providerToken?: string;
}

/**
 * User login credentials
 */
export interface LoginDTO {
  /** Email or phone number */
  identifier: string;
  /** Password */
  password: string;
}

/**
 * Social authentication request
 */
export interface SocialLoginDTO {
  /** Authentication provider */
  provider: AuthProvider;
  /** Provider access token */
  token: string;
}

/**
 * User profile for display
 */
export interface UserProfile {
  /** User ID */
  id: UUID;
  /** Email address */
  email: string;
  /** Phone number */
  phoneNumber?: string;
  /** Full name */
  fullName: string;
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Profile picture URL */
  profilePictureUrl?: string;
  /** Date of birth */
  dateOfBirth?: string;
  /** Account creation date */
  createdAt: Timestamp;
}

/**
 * User profile update request
 */
export interface UpdateProfileDTO {
  /** First name */
  firstName?: string;
  /** Last name */
  lastName?: string;
  /** Phone number */
  phoneNumber?: string;
  /** Date of birth */
  dateOfBirth?: string;
  /** Profile picture URL */
  profilePictureUrl?: string;
}

/**
 * Emergency contact information
 */
export interface EmergencyContact {
  /** Contact ID */
  id: UUID;
  /** User ID who owns this contact */
  userId: UUID;
  /** Contact's name */
  name: string;
  /** Contact's phone number */
  phoneNumber: string;
  /** Contact's email */
  email?: string;
  /** Relationship to user */
  relationship?: string;
  /** Priority level */
  priority: ContactPriority;
  /** Can view medical information */
  canViewMedicalInfo: boolean;
  /** Creation timestamp */
  createdAt: Timestamp;
  /** Last update timestamp */
  updatedAt: Timestamp;
}

/**
 * Emergency contact creation request
 */
export interface CreateEmergencyContactDTO {
  /** Contact's name */
  name: string;
  /** Contact's phone number */
  phoneNumber: string;
  /** Contact's email */
  email?: string;
  /** Relationship to user */
  relationship?: string;
  /** Priority level */
  priority: ContactPriority;
  /** Can view medical information */
  canViewMedicalInfo?: boolean;
}

/**
 * Emergency contact update request
 */
export interface UpdateEmergencyContactDTO {
  /** Contact's name */
  name?: string;
  /** Contact's phone number */
  phoneNumber?: string;
  /** Contact's email */
  email?: string;
  /** Relationship to user */
  relationship?: string;
  /** Priority level */
  priority?: ContactPriority;
  /** Can view medical information */
  canViewMedicalInfo?: boolean;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  /** Access token (JWT) */
  accessToken: string;
  /** Refresh token */
  refreshToken: string;
  /** Token expiration time in seconds */
  expiresIn: number;
  /** User profile */
  user: UserProfile;
}

/**
 * Token pair for refresh
 */
export interface TokenPair {
  /** Access token */
  accessToken: string;
  /** Refresh token */
  refreshToken: string;
  /** Expiration time in seconds */
  expiresIn: number;
}

/**
 * JWT token payload
 */
export interface TokenPayload {
  /** User ID */
  sub: UUID;
  /** Email */
  email: string;
  /** User role */
  role: UserRole;
  /** Issued at timestamp */
  iat: number;
  /** Expiration timestamp */
  exp: number;
}

/**
 * Password reset request
 */
export interface PasswordResetRequestDTO {
  /** Email address */
  email: string;
}

/**
 * Password reset confirmation
 */
export interface PasswordResetDTO {
  /** Reset token */
  token: string;
  /** New password */
  newPassword: string;
}

/**
 * Password change request
 */
export interface ChangePasswordDTO {
  /** Current password */
  oldPassword: string;
  /** New password */
  newPassword: string;
}

/**
 * Multi-factor authentication setup response
 */
export interface MFASetupResponse {
  /** Secret key for TOTP */
  secret: string;
  /** QR code data URL */
  qrCode: string;
  /** Backup codes */
  backupCodes: string[];
}

/**
 * MFA verification request
 */
export interface MFAVerifyDTO {
  /** Verification code */
  code: string;
}

/**
 * User session information
 */
export interface Session {
  /** Session ID */
  id: UUID;
  /** User ID */
  userId: UUID;
  /** Device ID */
  deviceId: string;
  /** Refresh token */
  refreshToken: string;
  /** Session expiration */
  expiresAt: Timestamp;
  /** Creation timestamp */
  createdAt: Timestamp;
}

/**
 * User preferences/settings
 */
export interface UserSettings {
  /** User ID */
  userId: UUID;
  /** Notification preferences */
  notifications: {
    /** Push notifications enabled */
    push: boolean;
    /** SMS notifications enabled */
    sms: boolean;
    /** Email notifications enabled */
    email: boolean;
  };
  /** Privacy settings */
  privacy: {
    /** Show medical info on lock screen */
    showMedicalOnLockScreen: boolean;
    /** Share location with emergency services */
    shareLocationWithEmergencyServices: boolean;
  };
  /** Emergency settings */
  emergency: {
    /** Countdown duration in seconds */
    countdownSeconds: number;
    /** Auto-trigger from devices enabled */
    autoTriggerFromDevices: boolean;
  };
}
