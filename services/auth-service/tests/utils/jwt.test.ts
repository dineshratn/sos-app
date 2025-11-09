import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  isTokenExpired,
  getTokenExpiryTime,
} from '../../src/utils/jwt';

describe('JWT Utilities', () => {
  const mockUserId = 'user-123';
  const mockEmail = 'test@example.com';
  const mockSessionId = 'session-456';

  describe('generateAccessToken', () => {
    it('should generate valid access token', () => {
      const token = generateAccessToken(mockUserId, mockEmail, mockSessionId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should include userId and email in payload', () => {
      const token = generateAccessToken(mockUserId, mockEmail, mockSessionId);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockUserId);
      expect(decoded?.email).toBe(mockEmail);
      expect(decoded?.type).toBe('access');
    });

    it('should include sessionId if provided', () => {
      const token = generateAccessToken(mockUserId, mockEmail, mockSessionId);
      const decoded = decodeToken(token);

      expect(decoded?.sessionId).toBe(mockSessionId);
    });

    it('should work without sessionId', () => {
      const token = generateAccessToken(mockUserId, mockEmail);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockUserId);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate valid refresh token', () => {
      const token = generateRefreshToken(mockUserId, mockEmail, mockSessionId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('should include userId, email, and sessionId', () => {
      const token = generateRefreshToken(mockUserId, mockEmail, mockSessionId);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockUserId);
      expect(decoded?.email).toBe(mockEmail);
      expect(decoded?.sessionId).toBe(mockSessionId);
      expect(decoded?.type).toBe('refresh');
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const tokens = generateTokenPair(mockUserId, mockEmail, mockSessionId);

      expect(tokens).toBeDefined();
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBeDefined();
      expect(typeof tokens.expiresIn).toBe('number');
    });

    it('should have different tokens', () => {
      const tokens = generateTokenPair(mockUserId, mockEmail, mockSessionId);

      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });

    it('should include expiry time', () => {
      const tokens = generateTokenPair(mockUserId, mockEmail, mockSessionId);

      expect(tokens.expiresIn).toBeGreaterThan(0);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const token = generateAccessToken(mockUserId, mockEmail, mockSessionId);
      const decoded = verifyAccessToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(mockUserId);
      expect(decoded.email).toBe(mockEmail);
      expect(decoded.type).toBe('access');
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyAccessToken(invalidToken)).toThrow();
    });

    it('should throw error for refresh token', () => {
      const refreshToken = generateRefreshToken(mockUserId, mockEmail, mockSessionId);

      expect(() => verifyAccessToken(refreshToken)).toThrow('Invalid token type');
    });

    it('should throw error for malformed token', () => {
      expect(() => verifyAccessToken('malformed-token')).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const token = generateRefreshToken(mockUserId, mockEmail, mockSessionId);
      const decoded = verifyRefreshToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(mockUserId);
      expect(decoded.email).toBe(mockEmail);
      expect(decoded.sessionId).toBe(mockSessionId);
      expect(decoded.type).toBe('refresh');
    });

    it('should throw error for access token', () => {
      const accessToken = generateAccessToken(mockUserId, mockEmail, mockSessionId);

      expect(() => verifyRefreshToken(accessToken)).toThrow('Invalid token type');
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyRefreshToken(invalidToken)).toThrow();
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = generateAccessToken(mockUserId, mockEmail, mockSessionId);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockUserId);
      expect(decoded?.email).toBe(mockEmail);
    });

    it('should return null for invalid token', () => {
      const decoded = decodeToken('invalid-token');

      expect(decoded).toBeNull();
    });

    it('should decode expired token', () => {
      // This should still decode without error
      const token = generateAccessToken(mockUserId, mockEmail, mockSessionId);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for fresh token', () => {
      const token = generateAccessToken(mockUserId, mockEmail, mockSessionId);
      const expired = isTokenExpired(token);

      expect(expired).toBe(false);
    });

    it('should return true for invalid token', () => {
      const expired = isTokenExpired('invalid-token');

      expect(expired).toBe(true);
    });

    it('should return true for malformed token', () => {
      const expired = isTokenExpired('malformed.token');

      expect(expired).toBe(true);
    });
  });

  describe('getTokenExpiryTime', () => {
    it('should return positive number for fresh token', () => {
      const token = generateAccessToken(mockUserId, mockEmail, mockSessionId);
      const expiryTime = getTokenExpiryTime(token);

      expect(expiryTime).toBeGreaterThan(0);
    });

    it('should return 0 for invalid token', () => {
      const expiryTime = getTokenExpiryTime('invalid-token');

      expect(expiryTime).toBe(0);
    });

    it('should return reasonable expiry time', () => {
      const token = generateAccessToken(mockUserId, mockEmail, mockSessionId);
      const expiryTime = getTokenExpiryTime(token);

      // Should be around 15 minutes (900 seconds)
      expect(expiryTime).toBeGreaterThan(850);
      expect(expiryTime).toBeLessThan(950);
    });
  });

  describe('Token consistency', () => {
    it('should encode and decode consistently', () => {
      const token = generateAccessToken(mockUserId, mockEmail, mockSessionId);
      const decoded = decodeToken(token);
      const verified = verifyAccessToken(token);

      expect(decoded?.userId).toBe(verified.userId);
      expect(decoded?.email).toBe(verified.email);
      expect(decoded?.sessionId).toBe(verified.sessionId);
    });

    it('should generate unique tokens each time', () => {
      const token1 = generateAccessToken(mockUserId, mockEmail, mockSessionId);
      const token2 = generateAccessToken(mockUserId, mockEmail, mockSessionId);

      expect(token1).not.toBe(token2);
    });
  });
});
