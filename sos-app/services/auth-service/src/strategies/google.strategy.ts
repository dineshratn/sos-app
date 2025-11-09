import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import config from '../config';
import logger from '../utils/logger';

/**
 * Google OAuth 2.0 Strategy Configuration
 * Handles authentication via Google Sign-In
 */

export interface GoogleProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  emailVerified: boolean;
}

/**
 * Extract user profile from Google response
 */
const extractProfile = (profile: Profile): GoogleProfile => {
  const email = profile.emails?.[0]?.value || '';
  const emailVerified = profile.emails?.[0]?.verified || false;

  return {
    id: profile.id,
    email,
    firstName: profile.name?.givenName,
    lastName: profile.name?.familyName,
    profilePictureUrl: profile.photos?.[0]?.value,
    emailVerified,
  };
};

/**
 * Configure Google OAuth Strategy
 */
export const configureGoogleStrategy = (): void => {
  if (!config.google.clientId || !config.google.clientSecret) {
    logger.warn('Google OAuth not configured - missing credentials');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
        scope: ['profile', 'email'],
        passReqToCallback: true,
      },
      async (_req, _accessToken, _refreshToken, profile, done) => {
        try {
          const userProfile = extractProfile(profile);

          logger.info(`Google OAuth successful for: ${userProfile.email}`);

          // Pass profile to callback handler
          return done(null, userProfile);
        } catch (error) {
          logger.error('Google OAuth error:', error);
          return done(error as Error);
        }
      }
    )
  );

  logger.info('✅ Google OAuth strategy configured');
};

export default configureGoogleStrategy;
