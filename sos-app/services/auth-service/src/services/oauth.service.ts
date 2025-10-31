import User, { AuthProvider } from '../models/User';
import Session from '../models/Session';
import { generateTokenPair } from '../utils/jwt';
import redisService from './redis.service';
import logger from '../utils/logger';
import config from '../config';
import { AuthResponse, DeviceInfo } from '../types/auth.types';
import { AppError } from '../middleware/errorHandler';
import { GoogleProfile } from '../strategies/google.strategy';
import { AppleProfile } from '../strategies/apple.strategy';

type OAuthProfile = GoogleProfile | AppleProfile;

class OAuthService {
  /**
   * Handle OAuth authentication (Google or Apple)
   * Creates new user or links to existing account
   */
  public async handleOAuthLogin(
    profile: OAuthProfile,
    provider: AuthProvider,
    deviceData: { deviceId: string; deviceName?: string; deviceType?: string },
    deviceInfo: DeviceInfo
  ): Promise<AuthResponse> {
    try {
      // Find existing user by provider ID
      let user = await User.findOne({
        where: {
          authProvider: provider,
          providerId: profile.id,
        },
      });

      if (user) {
        // Existing OAuth user - login
        logger.info(`OAuth user login: ${user.id} (${provider})`);
        return await this.loginOAuthUser(user, deviceData, deviceInfo);
      }

      // Check if email is already registered with different provider
      if (profile.email) {
        const existingUser = await User.findOne({
          where: { email: profile.email },
        });

        if (existingUser) {
          // Email exists with different auth method
          if (existingUser.authProvider === AuthProvider.LOCAL) {
            throw new AppError(
              `An account with this email already exists. Please login with email/password or link your ${provider} account.`,
              409,
              'EMAIL_EXISTS_DIFFERENT_PROVIDER'
            );
          } else {
            throw new AppError(
              `This email is already linked to ${existingUser.authProvider} account.`,
              409,
              'EMAIL_LINKED_TO_OTHER_PROVIDER'
            );
          }
        }
      }

      // Create new OAuth user
      user = await User.create({
        email: profile.email,
        authProvider: provider,
        providerId: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        emailVerified: profile.emailVerified || false,
      });

      logger.info(`New OAuth user created: ${user.id} (${provider})`);

      return await this.loginOAuthUser(user, deviceData, deviceInfo);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('OAuth authentication error:', error);
      throw new AppError('OAuth authentication failed', 500, 'OAUTH_ERROR');
    }
  }

  /**
   * Login OAuth user and create session
   * @private
   */
  private async loginOAuthUser(
    user: User,
    deviceData: { deviceId: string; deviceName?: string; deviceType?: string },
    deviceInfo: DeviceInfo
  ): Promise<AuthResponse> {
    // Update last login
    user.updateLastLogin();
    await user.save();

    // Check for existing session on this device
    const existingSession = await Session.findOne({
      where: {
        userId: user.id,
        deviceId: deviceData.deviceId,
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
      session = await this.createSession(user.id, tokens.refreshToken, deviceData, deviceInfo);
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
      message: 'OAuth login successful',
      user: user.toSafeObject(),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: 'Bearer',
      },
      session: session.toSafeObject(),
    };
  }

  /**
   * Link OAuth account to existing user
   * Allows users to add Google/Apple login to their local account
   */
  public async linkOAuthAccount(
    userId: string,
    profile: OAuthProfile,
    provider: AuthProvider
  ): Promise<User> {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Check if OAuth account is already linked to another user
      const existingOAuthUser = await User.findOne({
        where: {
          authProvider: provider,
          providerId: profile.id,
        },
      });

      if (existingOAuthUser && existingOAuthUser.id !== userId) {
        throw new AppError(
          `This ${provider} account is already linked to another user`,
          409,
          'OAUTH_ACCOUNT_ALREADY_LINKED'
        );
      }

      // Can't change auth provider if already using OAuth
      if (user.authProvider !== AuthProvider.LOCAL) {
        throw new AppError(
          'Cannot link OAuth account. Account is already using OAuth authentication.',
          400,
          'ALREADY_OAUTH_ACCOUNT'
        );
      }

      // Update user to use OAuth
      user.authProvider = provider;
      user.providerId = profile.id;

      // Update email verification if OAuth email is verified
      if (profile.emailVerified && profile.email === user.email) {
        user.emailVerified = true;
      }

      await user.save();

      logger.info(`OAuth account linked: ${userId} -> ${provider}`);

      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('OAuth account linking error:', error);
      throw new AppError('Failed to link OAuth account', 500, 'OAUTH_LINK_ERROR');
    }
  }

  /**
   * Unlink OAuth account from user
   * Requires user to have password set (can't unlink if it's the only auth method)
   */
  public async unlinkOAuthAccount(userId: string): Promise<User> {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Can't unlink if using local auth
      if (user.authProvider === AuthProvider.LOCAL) {
        throw new AppError('Account is not using OAuth authentication', 400, 'NOT_OAUTH_ACCOUNT');
      }

      // Can't unlink without password (would lock user out)
      if (!user.passwordHash) {
        throw new AppError(
          'Cannot unlink OAuth account without setting a password first',
          400,
          'NO_PASSWORD_SET'
        );
      }

      // Convert to local auth
      user.authProvider = AuthProvider.LOCAL;
      user.providerId = undefined;
      await user.save();

      logger.info(`OAuth account unlinked: ${userId}`);

      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('OAuth account unlinking error:', error);
      throw new AppError('Failed to unlink OAuth account', 500, 'OAUTH_UNLINK_ERROR');
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

export default new OAuthService();
