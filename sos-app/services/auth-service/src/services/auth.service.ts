import User, { AuthProvider } from '../models/User';
import Session from '../models/Session';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { generateTokenPair, verifyRefreshToken, getTokenExpiryTime } from '../utils/jwt';
import redisService from './redis.service';
import logger from '../utils/logger';
import config from '../config';
import {
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  LogoutRequest,
  AuthResponse,
  LogoutResponse,
  DeviceInfo,
} from '../types/auth.types';
import { AppError } from '../middleware/errorHandler';
import crypto from 'crypto';

class AuthService {
  /**
   * Register a new user with email/password
   */
  public async register(data: RegisterRequest, deviceInfo: DeviceInfo): Promise<AuthResponse> {
    try {
      // Validate password strength
      const passwordValidation = validatePasswordStrength(data.password);
      if (!passwordValidation.isValid) {
        throw new AppError(passwordValidation.message || 'Invalid password', 400, 'WEAK_PASSWORD');
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new AppError('User with this email already exists', 409, 'USER_EXISTS');
      }

      // Check phone number if provided
      if (data.phoneNumber) {
        const existingPhone = await User.findOne({
          where: { phoneNumber: data.phoneNumber },
        });

        if (existingPhone) {
          throw new AppError('User with this phone number already exists', 409, 'PHONE_EXISTS');
        }
      }

      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Create user
      const user = await User.create({
        email: data.email,
        phoneNumber: data.phoneNumber,
        passwordHash,
        authProvider: AuthProvider.LOCAL,
        firstName: data.firstName,
        lastName: data.lastName,
      });

      logger.info(`New user registered: ${user.id} (${user.email})`);

      // Generate tokens and create session
      const tokens = generateTokenPair(user.id, user.email, '');

      // Create session
      const session = await this.createSession(user.id, tokens.refreshToken, data, deviceInfo);

      // Cache session in Redis
      await redisService.cacheSession(
        session.id,
        { userId: user.id, email: user.email },
        config.session.timeoutHours * 3600
      );

      return {
        success: true,
        message: 'User registered successfully',
        user: user.toSafeObject(),
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          tokenType: 'Bearer',
        },
        session: session.toSafeObject(),
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Registration error:', error);
      throw new AppError('Registration failed', 500, 'REGISTRATION_ERROR');
    }
  }

  /**
   * Login with email/password
   */
  public async login(data: LoginRequest, deviceInfo: DeviceInfo): Promise<AuthResponse> {
    try {
      // Validate input - must provide either email or phone
      if (!data.email && !data.phoneNumber) {
        throw new AppError('Email or phone number required', 400, 'MISSING_IDENTIFIER');
      }

      // Find user
      const whereClause: any = {};
      const identifier = data.email || data.phoneNumber;

      if (data.email) {
        whereClause.email = data.email;
      } else {
        whereClause.phoneNumber = data.phoneNumber;
      }

      const user = await User.findOne({ where: whereClause });

      // Check Redis rate limiting
      const failedAttempts = await redisService.getFailedLoginAttempts(identifier!);
      if (failedAttempts >= 10) {
        throw new AppError(
          'Too many failed login attempts. Please try again later.',
          429,
          'RATE_LIMIT_EXCEEDED'
        );
      }

      if (!user) {
        // Increment failed attempts in Redis
        await redisService.incrementFailedLogin(identifier!, config.rateLimit.loginWindowMs / 1000);
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Check if account is locked
      if (user.isAccountLocked()) {
        throw new AppError(
          'Account is temporarily locked due to multiple failed login attempts. Please try again later.',
          423,
          'ACCOUNT_LOCKED'
        );
      }

      // Verify password
      if (!user.passwordHash) {
        throw new AppError('This account uses social login', 400, 'NO_PASSWORD');
      }

      const isPasswordValid = await comparePassword(data.password, user.passwordHash);

      if (!isPasswordValid) {
        // Increment failed attempts in database
        user.incrementFailedLoginAttempts();
        await user.save();

        // Increment failed attempts in Redis
        await redisService.incrementFailedLogin(identifier!, config.rateLimit.loginWindowMs / 1000);

        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Successful login - reset failed attempts
      user.resetFailedLoginAttempts();
      user.updateLastLogin();
      await user.save();

      // Reset Redis counter
      await redisService.resetFailedLogin(identifier!);

      // Check for existing session on this device
      const existingSession = await Session.findOne({
        where: {
          userId: user.id,
          deviceId: data.deviceId,
        },
      });

      let session: Session;

      if (existingSession && existingSession.isValid()) {
        // Update existing session
        const tokens = generateTokenPair(user.id, user.email, existingSession.id);
        existingSession.refreshToken = tokens.refreshToken;
        existingSession.ipAddress = deviceInfo.ipAddress;
        existingSession.userAgent = deviceInfo.userAgent;
        existingSession.updateLastActive();
        await existingSession.save();
        session = existingSession;

        logger.info(`User logged in (existing session): ${user.id} (${user.email})`);
      } else {
        // Check session limit
        const sessionCount = await Session.count({
          where: { userId: user.id },
        });

        if (sessionCount >= config.session.maxSessionsPerUser) {
          // Delete oldest session
          const oldestSession = await Session.findOne({
            where: { userId: user.id },
            order: [['createdAt', 'ASC']],
          });

          if (oldestSession) {
            await redisService.deleteSession(oldestSession.id);
            await oldestSession.destroy();
          }
        }

        // Create new session
        const tokens = generateTokenPair(user.id, user.email, '');
        session = await this.createSession(user.id, tokens.refreshToken, data, deviceInfo);

        logger.info(`User logged in (new session): ${user.id} (${user.email})`);
      }

      // Generate fresh tokens
      const tokens = generateTokenPair(user.id, user.email, session.id);

      // Update session with new refresh token
      session.refreshToken = tokens.refreshToken;
      await session.save();

      // Cache session in Redis
      await redisService.cacheSession(
        session.id,
        { userId: user.id, email: user.email },
        config.session.timeoutHours * 3600
      );

      return {
        success: true,
        message: 'Login successful',
        user: user.toSafeObject(),
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          tokenType: 'Bearer',
        },
        session: session.toSafeObject(),
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Login error:', error);
      throw new AppError('Login failed', 500, 'LOGIN_ERROR');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshToken(data: RefreshTokenRequest): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(data.refreshToken);

      // Check if token is blacklisted
      const isBlacklisted = await redisService.isTokenBlacklisted(data.refreshToken);
      if (isBlacklisted) {
        throw new AppError('Token has been revoked', 401, 'TOKEN_REVOKED');
      }

      // Find session
      const session = await Session.findOne({
        where: {
          id: decoded.sessionId,
          refreshToken: data.refreshToken,
        },
        include: [User],
      });

      if (!session) {
        throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }

      // Check if session is expired
      if (session.isExpired()) {
        await session.destroy();
        throw new AppError('Session has expired', 401, 'SESSION_EXPIRED');
      }

      // Check device ID matches (security measure)
      if (session.deviceId !== data.deviceId) {
        throw new AppError('Device mismatch', 403, 'DEVICE_MISMATCH');
      }

      const user = session.user!;

      // Generate new tokens with token rotation (refresh token changes)
      const newTokens = generateTokenPair(user.id, user.email, session.id);

      // Blacklist old refresh token
      const oldTokenExpiry = getTokenExpiryTime(data.refreshToken);
      if (oldTokenExpiry > 0) {
        await redisService.blacklistToken(data.refreshToken, oldTokenExpiry);
      }

      // Update session with new refresh token
      session.refreshToken = newTokens.refreshToken;
      session.updateLastActive();
      await session.save();

      // Update cache
      await redisService.cacheSession(
        session.id,
        { userId: user.id, email: user.email },
        config.session.timeoutHours * 3600
      );

      logger.info(`Token refreshed for user: ${user.id}`);

      return {
        success: true,
        message: 'Token refreshed successfully',
        user: user.toSafeObject(),
        tokens: {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiresIn: newTokens.expiresIn,
          tokenType: 'Bearer',
        },
        session: session.toSafeObject(),
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Token refresh error:', error);
      throw new AppError('Token refresh failed', 500, 'REFRESH_ERROR');
    }
  }

  /**
   * Logout user and revoke tokens
   */
  public async logout(userId: string, data: LogoutRequest): Promise<LogoutResponse> {
    try {
      let sessionsDeleted = 0;

      if (data.allDevices) {
        // Logout from all devices
        const sessions = await Session.findAll({
          where: { userId },
        });

        for (const session of sessions) {
          // Blacklist refresh token
          const expiry = getTokenExpiryTime(session.refreshToken);
          if (expiry > 0) {
            await redisService.blacklistToken(session.refreshToken, expiry);
          }

          // Delete from cache
          await redisService.deleteSession(session.id);
        }

        // Delete all sessions from database
        sessionsDeleted = await Session.destroy({
          where: { userId },
        });

        logger.info(`User logged out from all devices: ${userId} (${sessionsDeleted} sessions)`);
      } else if (data.refreshToken) {
        // Logout from specific device using refresh token
        const session = await Session.findOne({
          where: {
            userId,
            refreshToken: data.refreshToken,
          },
        });

        if (session) {
          // Blacklist refresh token
          const expiry = getTokenExpiryTime(session.refreshToken);
          if (expiry > 0) {
            await redisService.blacklistToken(session.refreshToken, expiry);
          }

          // Delete from cache
          await redisService.deleteSession(session.id);

          // Delete session
          await session.destroy();
          sessionsDeleted = 1;

          logger.info(`User logged out from device: ${userId}`);
        }
      } else if (data.deviceId) {
        // Logout from specific device using device ID
        const session = await Session.findOne({
          where: {
            userId,
            deviceId: data.deviceId,
          },
        });

        if (session) {
          // Blacklist refresh token
          const expiry = getTokenExpiryTime(session.refreshToken);
          if (expiry > 0) {
            await redisService.blacklistToken(session.refreshToken, expiry);
          }

          // Delete from cache
          await redisService.deleteSession(session.id);

          // Delete session
          await session.destroy();
          sessionsDeleted = 1;

          logger.info(`User logged out from device: ${userId} (${data.deviceId})`);
        }
      }

      return {
        success: true,
        message: `Successfully logged out from ${sessionsDeleted} device(s)`,
        sessionsTerminated: sessionsDeleted,
      };
    } catch (error) {
      logger.error('Logout error:', error);
      throw new AppError('Logout failed', 500, 'LOGOUT_ERROR');
    }
  }

  /**
   * Request password reset - generates token and sends email
   */
  public async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findOne({ where: { email } });

      // For security, always return success even if user doesn't exist
      if (!user) {
        logger.warn(`Password reset requested for non-existent email: ${email}`);
        return {
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.',
        };
      }

      // Generate secure random token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Set token expiration (1 hour)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // Store hashed token in database
      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = expiresAt;
      await user.save();

      // TODO: Send email with reset link containing resetToken (not hashed)
      // For now, log the token (in production, this would be sent via email)
      logger.info(`Password reset token generated for ${email}: ${resetToken}`);
      logger.info(`Reset link: ${config.frontendUrl}/reset-password?token=${resetToken}`);

      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      };
    } catch (error) {
      logger.error('Password reset request error:', error);
      throw new AppError('Failed to process password reset request', 500, 'RESET_REQUEST_ERROR');
    }
  }

  /**
   * Reset password using token
   */
  public async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new AppError(passwordValidation.message || 'Invalid password', 400, 'WEAK_PASSWORD');
      }

      // Hash the token to match what's stored in database
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Find user with valid reset token
      const user = await User.findOne({
        where: {
          passwordResetToken: hashedToken,
        },
      });

      if (!user || !user.passwordResetExpires) {
        throw new AppError('Invalid or expired password reset token', 400, 'INVALID_RESET_TOKEN');
      }

      // Check if token is expired
      if (new Date() > user.passwordResetExpires) {
        // Clear expired token
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        throw new AppError('Password reset token has expired', 400, 'EXPIRED_RESET_TOKEN');
      }

      // Hash new password
      const passwordHash = await hashPassword(newPassword);

      // Update password and clear reset token
      user.passwordHash = passwordHash;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      // Invalidate all existing sessions for security
      const sessions = await Session.findAll({
        where: { userId: user.id },
      });

      for (const session of sessions) {
        // Blacklist refresh token
        const expiry = getTokenExpiryTime(session.refreshToken);
        if (expiry > 0) {
          await redisService.blacklistToken(session.refreshToken, expiry);
        }
        // Delete from cache
        await redisService.deleteSession(session.id);
      }

      // Delete all sessions from database
      await Session.destroy({
        where: { userId: user.id },
      });

      logger.info(`Password reset successful for user: ${user.id}`);

      return {
        success: true,
        message: 'Password has been reset successfully. Please log in with your new password.',
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Password reset error:', error);
      throw new AppError('Failed to reset password', 500, 'RESET_PASSWORD_ERROR');
    }
  }

  /**
   * Create a new session
   * @private
   */
  private async createSession(
    userId: string,
    refreshToken: string,
    deviceData: { deviceId: string; deviceName?: string; deviceType?: string },
    deviceInfo: DeviceInfo
  ): Promise<Session> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.session.timeoutHours);

    const session = await Session.create({
      userId,
      deviceId: deviceData.deviceId,
      deviceName: deviceData.deviceName,
      deviceType: deviceData.deviceType,
      refreshToken,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      expiresAt,
    });

    return session;
  }
}

export default new AuthService();
