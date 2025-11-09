import jwt from 'jsonwebtoken';
import config from '../config';
import { v4 as uuidv4 } from 'uuid';

/**
 * JWT utility for token generation and validation
 * Supports both access tokens (short-lived) and refresh tokens (long-lived)
 */

export interface TokenPayload {
  userId: string;
  email: string;
  sessionId?: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Generate a JWT access token
 * @param userId - User ID
 * @param email - User email
 * @param sessionId - Optional session ID
 * @returns JWT access token
 */
export const generateAccessToken = (
  userId: string,
  email: string,
  sessionId?: string
): string => {
  const payload: TokenPayload = {
    userId,
    email,
    sessionId,
    type: 'access',
  };

  const token = jwt.sign(
    payload as jwt.JwtPayload,
    config.jwt.secret as string,
    {
      expiresIn: config.jwt.accessTokenExpiry,
      issuer: config.serviceName,
      audience: 'sos-app',
    }
  );

  return token;
};

/**
 * Generate a JWT refresh token
 * @param userId - User ID
 * @param email - User email
 * @param sessionId - Session ID
 * @returns JWT refresh token
 */
export const generateRefreshToken = (
  userId: string,
  email: string,
  sessionId: string
): string => {
  const payload: TokenPayload = {
    userId,
    email,
    sessionId,
    type: 'refresh',
  };

  const token = jwt.sign(
    payload as jwt.JwtPayload,
    config.jwt.refreshSecret as string,
    {
      expiresIn: config.jwt.refreshTokenExpiry,
      issuer: config.serviceName,
      audience: 'sos-app',
      jwtid: uuidv4(), // Unique token ID for tracking
    }
  );

  return token;
};

/**
 * Generate both access and refresh tokens
 * @param userId - User ID
 * @param email - User email
 * @param sessionId - Session ID
 * @returns Token pair with expiry info
 */
export const generateTokenPair = (
  userId: string,
  email: string,
  sessionId: string
): TokenPair => {
  const accessToken = generateAccessToken(userId, email, sessionId);
  const refreshToken = generateRefreshToken(userId, email, sessionId);

  // Calculate expiry in seconds
  const decoded = jwt.decode(accessToken) as any;
  const expiresIn = decoded.exp - decoded.iat;

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
};

/**
 * Verify a JWT access token
 * @param token - JWT token
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: config.serviceName,
      audience: 'sos-app',
    }) as TokenPayload;

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access token');
    }
    throw error;
  }
};

/**
 * Verify a JWT refresh token
 * @param token - JWT token
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret, {
      issuer: config.serviceName,
      audience: 'sos-app',
    }) as TokenPayload;

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
};

/**
 * Decode a JWT token without verification (for inspection)
 * @param token - JWT token
 * @returns Decoded token payload or null
 */
export const decodeToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.decode(token) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Check if a token is expired without throwing an error
 * @param token - JWT token
 * @returns True if expired, false otherwise
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    return decoded.exp * 1000 < Date.now();
  } catch (error) {
    return true;
  }
};

/**
 * Get remaining time until token expiration
 * @param token - JWT token
 * @returns Remaining time in seconds, or 0 if expired
 */
export const getTokenExpiryTime = (token: string): number => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return 0;
  }

  const expiryTime = decoded.exp * 1000;
  const now = Date.now();

  if (expiryTime < now) {
    return 0;
  }

  return Math.floor((expiryTime - now) / 1000);
};
