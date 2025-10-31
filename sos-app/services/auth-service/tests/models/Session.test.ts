import Session from '../../src/models/Session';

describe('Session Model', () => {
  const mockSessionData = {
    userId: 'user-123',
    deviceId: 'device-456',
    deviceName: 'iPhone 14',
    deviceType: 'ios',
    refreshToken: 'mock-refresh-token',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  };

  describe('Instance methods', () => {
    describe('isExpired', () => {
      it('should return false when expiresAt is in the future', () => {
        const session = Session.build({
          ...mockSessionData,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        });

        expect(session.isExpired()).toBe(false);
      });

      it('should return true when expiresAt is in the past', () => {
        const session = Session.build({
          ...mockSessionData,
          expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        });

        expect(session.isExpired()).toBe(true);
      });

      it('should return true when expiresAt is exactly now', () => {
        const session = Session.build({
          ...mockSessionData,
          expiresAt: new Date(),
        });

        // May need to wait a tiny bit for time to pass
        setTimeout(() => {
          expect(session.isExpired()).toBe(true);
        }, 1);
      });
    });

    describe('updateLastActive', () => {
      it('should set lastActiveAt to current time', () => {
        const session = Session.build(mockSessionData);
        const before = Date.now();

        session.updateLastActive();

        const after = Date.now();
        const lastActive = session.lastActiveAt.getTime();

        expect(lastActive).toBeGreaterThanOrEqual(before);
        expect(lastActive).toBeLessThanOrEqual(after);
      });

      it('should update from previous lastActiveAt', () => {
        const session = Session.build({
          ...mockSessionData,
          lastActiveAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        });

        const oldLastActive = session.lastActiveAt.getTime();

        // Wait a bit
        setTimeout(() => {
          session.updateLastActive();
          const newLastActive = session.lastActiveAt.getTime();

          expect(newLastActive).toBeGreaterThan(oldLastActive);
        }, 10);
      });
    });

    describe('isValid', () => {
      it('should return true for non-expired session', () => {
        const session = Session.build({
          ...mockSessionData,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        });

        expect(session.isValid()).toBe(true);
      });

      it('should return false for expired session', () => {
        const session = Session.build({
          ...mockSessionData,
          expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        });

        expect(session.isValid()).toBe(false);
      });
    });

    describe('toSafeObject', () => {
      it('should return session without sensitive data', () => {
        const session = Session.build({
          ...mockSessionData,
          id: 'session-789',
          createdAt: new Date(),
          lastActiveAt: new Date(),
        });

        const safeObject = session.toSafeObject();

        expect(safeObject.id).toBe('session-789');
        expect(safeObject.deviceId).toBe('device-456');
        expect(safeObject.deviceName).toBe('iPhone 14');
        expect(safeObject.deviceType).toBe('ios');
        expect(safeObject.ipAddress).toBe('192.168.1.1');

        // Sensitive fields should not be included
        expect(safeObject).not.toHaveProperty('refreshToken');
        expect(safeObject).not.toHaveProperty('userId');
        expect(safeObject).not.toHaveProperty('userAgent');
      });

      it('should include public fields', () => {
        const session = Session.build({
          ...mockSessionData,
          id: 'session-789',
          createdAt: new Date(),
          lastActiveAt: new Date(),
        });

        const safeObject = session.toSafeObject();

        expect(safeObject).toHaveProperty('id');
        expect(safeObject).toHaveProperty('deviceId');
        expect(safeObject).toHaveProperty('deviceName');
        expect(safeObject).toHaveProperty('deviceType');
        expect(safeObject).toHaveProperty('ipAddress');
        expect(safeObject).toHaveProperty('lastActiveAt');
        expect(safeObject).toHaveProperty('createdAt');
        expect(safeObject).toHaveProperty('expiresAt');
      });
    });
  });

  describe('Device tracking', () => {
    it('should store device information', () => {
      const session = Session.build({
        ...mockSessionData,
        deviceName: 'MacBook Pro',
        deviceType: 'desktop',
      });

      expect(session.deviceName).toBe('MacBook Pro');
      expect(session.deviceType).toBe('desktop');
    });

    it('should work with minimal device info', () => {
      const session = Session.build({
        userId: 'user-123',
        deviceId: 'device-456',
        refreshToken: 'token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      expect(session.deviceId).toBe('device-456');
      expect(session.deviceName).toBeUndefined();
      expect(session.deviceType).toBeUndefined();
    });

    it('should support different device types', () => {
      const deviceTypes = ['ios', 'android', 'web', 'desktop', 'other'];

      deviceTypes.forEach((type) => {
        const session = Session.build({
          ...mockSessionData,
          deviceType: type,
        });

        expect(session.deviceType).toBe(type);
      });
    });
  });

  describe('IP and User Agent tracking', () => {
    it('should store IP address', () => {
      const session = Session.build({
        ...mockSessionData,
        ipAddress: '10.0.0.1',
      });

      expect(session.ipAddress).toBe('10.0.0.1');
    });

    it('should store user agent', () => {
      const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)';
      const session = Session.build({
        ...mockSessionData,
        userAgent,
      });

      expect(session.userAgent).toBe(userAgent);
    });

    it('should work without IP or user agent', () => {
      const session = Session.build({
        userId: 'user-123',
        deviceId: 'device-456',
        refreshToken: 'token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      expect(session.ipAddress).toBeUndefined();
      expect(session.userAgent).toBeUndefined();
    });
  });

  describe('Session expiry', () => {
    it('should have future expiry date on creation', () => {
      const session = Session.build({
        ...mockSessionData,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should track time until expiry', () => {
      const expiryTime = Date.now() + 2 * 60 * 60 * 1000; // 2 hours from now
      const session = Session.build({
        ...mockSessionData,
        expiresAt: new Date(expiryTime),
      });

      const timeUntilExpiry = session.expiresAt.getTime() - Date.now();
      const twoHoursInMs = 2 * 60 * 60 * 1000;

      // Allow 1 second tolerance
      expect(timeUntilExpiry).toBeGreaterThan(twoHoursInMs - 1000);
      expect(timeUntilExpiry).toBeLessThan(twoHoursInMs + 1000);
    });
  });
});
