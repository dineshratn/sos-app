import passport from 'passport';
import AppleStrategy from 'passport-apple';
import config from '../config';
import logger from '../utils/logger';
import fs from 'fs';

/**
 * Apple OAuth 2.0 Strategy Configuration
 * Handles authentication via Sign in with Apple
 */

export interface AppleProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
}

/**
 * Configure Apple OAuth Strategy
 */
export const configureAppleStrategy = (): void => {
  if (!config.apple.clientId || !config.apple.teamId || !config.apple.keyId) {
    logger.warn('Apple OAuth not configured - missing credentials');
    return;
  }

  // Read private key from file
  let privateKey: string;
  try {
    if (config.apple.privateKeyPath && fs.existsSync(config.apple.privateKeyPath)) {
      privateKey = fs.readFileSync(config.apple.privateKeyPath, 'utf8');
    } else {
      logger.warn('Apple OAuth private key file not found');
      return;
    }
  } catch (error) {
    logger.error('Failed to read Apple OAuth private key:', error);
    return;
  }

  passport.use(
    new AppleStrategy(
      {
        clientID: config.apple.clientId,
        teamID: config.apple.teamId,
        keyID: config.apple.keyId,
        privateKeyString: privateKey,
        callbackURL: config.apple.callbackUrl,
        scope: ['name', 'email'],
        passReqToCallback: true,
      },
      async (req: any, accessToken: string, refreshToken: string, idToken: any, profile: any, done: any) => {
        try {
          // Apple provides user info only on first login
          // Subsequent logins only provide the user ID
          const userProfile: AppleProfile = {
            id: profile.id || idToken.sub,
            email: profile.email || idToken.email || '',
            firstName: profile.name?.firstName,
            lastName: profile.name?.lastName,
            emailVerified: true, // Apple emails are always verified
          };

          logger.info(`Apple OAuth successful for: ${userProfile.email || userProfile.id}`);

          return done(null, userProfile);
        } catch (error) {
          logger.error('Apple OAuth error:', error);
          return done(error as Error);
        }
      }
    )
  );

  logger.info('✅ Apple OAuth strategy configured');
};

export default configureAppleStrategy;
