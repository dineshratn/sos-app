import { UserAttributes } from '../models/User';
import { SessionAttributes } from '../models/Session';

/**
 * Registration Request DTO
 */
export interface RegisterRequest {
  email: string;
  password: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  deviceId: string;
  deviceName?: string;
  deviceType?: string;
}

/**
 * Login Request DTO
 */
export interface LoginRequest {
  email?: string;
  phoneNumber?: string;
  password: string;
  deviceId: string;
  deviceName?: string;
  deviceType?: string;
}

/**
 * Token Refresh Request DTO
 */
export interface RefreshTokenRequest {
  refreshToken: string;
  deviceId: string;
}

/**
 * Logout Request DTO
 */
export interface LogoutRequest {
  refreshToken?: string;
  deviceId?: string;
  allDevices?: boolean;
}

/**
 * Authentication Response DTO
 */
export interface AuthResponse {
  success: boolean;
  message: string;
  user: Partial<UserAttributes>;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  };
  session: Partial<SessionAttributes>;
}

/**
 * Logout Response DTO
 */
export interface LogoutResponse {
  success: boolean;
  message: string;
  sessionsTerminated: number;
}

/**
 * Error Response DTO
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: any;
}

/**
 * Device Information
 */
export interface DeviceInfo {
  deviceId: string;
  deviceName?: string;
  deviceType?: string;
  ipAddress?: string;
  userAgent?: string;
}
