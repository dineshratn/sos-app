import Redis from 'ioredis';
import config from '../config';
import logger from '../utils/logger';

class RedisService {
  private client: Redis;
  private isConnected: boolean = false;

  constructor() {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('✅ Redis connected successfully');
    });

    this.client.on('error', (error) => {
      this.isConnected = false;
      logger.error('❌ Redis connection error:', error);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis connection closed');
    });
  }

  /**
   * Check if Redis is connected
   */
  public isReady(): boolean {
    return this.isConnected && this.client.status === 'ready';
  }

  /**
   * Add token to blacklist (for logout)
   * @param token - JWT token to blacklist
   * @param expirySeconds - TTL in seconds (should match token expiry)
   */
  public async blacklistToken(token: string, expirySeconds: number): Promise<void> {
    try {
      const key = `blacklist:${token}`;
      await this.client.setex(key, expirySeconds, '1');
      logger.debug(`Token blacklisted for ${expirySeconds}s`);
    } catch (error) {
      logger.error('Failed to blacklist token:', error);
      throw new Error('Failed to blacklist token');
    }
  }

  /**
   * Check if token is blacklisted
   * @param token - JWT token to check
   * @returns True if token is blacklisted
   */
  public async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const key = `blacklist:${token}`;
      const result = await this.client.get(key);
      return result !== null;
    } catch (error) {
      logger.error('Failed to check token blacklist:', error);
      // Fail open - if Redis is down, allow the token (it will still be validated by JWT)
      return false;
    }
  }

  /**
   * Cache session data
   * @param sessionId - Session ID
   * @param data - Session data to cache
   * @param ttlSeconds - TTL in seconds
   */
  public async cacheSession(sessionId: string, data: any, ttlSeconds: number): Promise<void> {
    try {
      const key = `session:${sessionId}`;
      await this.client.setex(key, ttlSeconds, JSON.stringify(data));
      logger.debug(`Session ${sessionId} cached for ${ttlSeconds}s`);
    } catch (error) {
      logger.error('Failed to cache session:', error);
      // Don't throw - caching is optional
    }
  }

  /**
   * Get cached session data
   * @param sessionId - Session ID
   * @returns Session data or null if not found
   */
  public async getSession(sessionId: string): Promise<any | null> {
    try {
      const key = `session:${sessionId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get cached session:', error);
      return null;
    }
  }

  /**
   * Delete cached session
   * @param sessionId - Session ID
   */
  public async deleteSession(sessionId: string): Promise<void> {
    try {
      const key = `session:${sessionId}`;
      await this.client.del(key);
      logger.debug(`Session ${sessionId} deleted from cache`);
    } catch (error) {
      logger.error('Failed to delete session from cache:', error);
      // Don't throw - it's not critical
    }
  }

  /**
   * Track failed login attempts
   * @param identifier - Email or phone number
   * @param windowSeconds - Time window in seconds
   * @returns Number of failed attempts in the window
   */
  public async incrementFailedLogin(identifier: string, windowSeconds: number): Promise<number> {
    try {
      const key = `failed:${identifier}`;
      const current = await this.client.incr(key);

      // Set expiry on first attempt
      if (current === 1) {
        await this.client.expire(key, windowSeconds);
      }

      return current;
    } catch (error) {
      logger.error('Failed to increment login attempts:', error);
      return 0;
    }
  }

  /**
   * Get failed login attempts count
   * @param identifier - Email or phone number
   * @returns Number of failed attempts
   */
  public async getFailedLoginAttempts(identifier: string): Promise<number> {
    try {
      const key = `failed:${identifier}`;
      const count = await this.client.get(key);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      logger.error('Failed to get login attempts:', error);
      return 0;
    }
  }

  /**
   * Reset failed login attempts
   * @param identifier - Email or phone number
   */
  public async resetFailedLogin(identifier: string): Promise<void> {
    try {
      const key = `failed:${identifier}`;
      await this.client.del(key);
    } catch (error) {
      logger.error('Failed to reset login attempts:', error);
    }
  }

  /**
   * Close Redis connection
   */
  public async close(): Promise<void> {
    await this.client.quit();
    logger.info('Redis connection closed');
  }
}

// Export singleton instance
export default new RedisService();
