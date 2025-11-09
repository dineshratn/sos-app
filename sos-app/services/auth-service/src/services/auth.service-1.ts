import User, { AuthProvider } from '../models/User';
import Session from '../models/Session';
import { hashPassword, validatePasswordStrength } from '../utils/password';
import { generateTokenPair } from '../utils/jwt';
import redisService from './redis.service';
import logger from '../utils/logger';
import config from '../config';
import {
  RegisterRequest,
  AuthResponse,
  DeviceInfo,
} from '../types/auth.types';
import { AppError } from '../middleware/errorHandler';

class AuthService {
  /**
   * Register a new user with email/password
   */
  public async register(data: RegisterRequest, deviceInfo: DeviceInfo): Promise<AuthResponse> {
    try {
      logger.debug('Register called with data:', data);

      // Validate password strength
      const passwordValidation = validatePasswordStrength(data.password);
      if (!passwordValidation.isValid) {
        logger.debug('Password strength validation failed:', passwordValidation.message);
        throw new AppError(passwordValidation.message || 'Invalid password', 400, 'WEAK_PASSWORD');
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        where: { email: data.email },
      });
      logger.debug('Existing user check result:', existingUser ? existingUser.id : 'none');

      if (existingUser) {
        throw new AppError('User with this email already exists', 409, 'USER_EXISTS');
      }

      // Check phone number if provided
      if (data.phoneNumber) {
        const existingPhone = await User.findOne({
          where: { phoneNumber: data.phoneNumber },
        });
        logger.debug('Existing phone check result:', existingPhone ? existingPhone.id : 'none');

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

      logger.info(`New user created: id=${user.id}, email=${user.email}`);

      if (!user.id) {
        logger.error('User ID is null or undefined after creation!');
        throw new AppError('User ID missing after creation', 500, 'USER_ID_MISSING');
      }

      // Generate tokens and create session
      const tokens = generateTokenPair(user.id, user.email, '');

      // Defensive: Compose deviceData for session creation
      const deviceData = {
        deviceId: deviceInfo.deviceId || 'unknown_device',
        deviceName: deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType,
      };

      logger.debug('Creating session with:', {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        deviceData,
        deviceInfo,
      });

      // Create session
      const session = await this.createSession(user.id, tokens.refreshToken, deviceData, deviceInfo);

      logger.info(`Session created with id=${session.id} for user ${user.id}`);

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

  // (Keep the rest of your methods: login, refreshToken, logout, requestPasswordReset, resetPassword unchanged or add debug logs similarly if needed)

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
    if (!userId) {
      logger.error('createSession called with null or undefined userId');
      throw new AppError('User ID is required for session creation', 400, 'USER_ID_REQUIRED');
    }
    if (!deviceData.deviceId) {
      logger.warn('Device ID is missing, defaulting to unknown_device');
      deviceData.deviceId = 'unknown_device';
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.session.timeoutHours);

    logger.debug('Creating session with data:', {
      userId,
      deviceData,
      refreshToken,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      expiresAt,
    });

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

    logger.debug(`Session created with id=${session.id} for userId=${userId}`);
    return session;
  }
}

export default new AuthService();
