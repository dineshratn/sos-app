import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import config from '../config';
import logger from './logger';
import { AppError } from '../middleware/errorHandler';

/**
 * Circuit Breaker implementation for service calls
 */
class CircuitBreaker {
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private serviceName: string,
    private threshold: number,
    private resetTimeout: number
  ) {}

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!config.circuitBreaker.enabled) {
      return fn();
    }

    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;

      if (timeSinceLastFailure > this.resetTimeout) {
        logger.info(`Circuit breaker for ${this.serviceName} moving to HALF_OPEN`);
        this.state = 'HALF_OPEN';
      } else {
        throw new AppError(
          `Service ${this.serviceName} is temporarily unavailable`,
          503,
          'SERVICE_UNAVAILABLE'
        );
      }
    }

    try {
      const result = await fn();

      if (this.state === 'HALF_OPEN') {
        logger.info(`Circuit breaker for ${this.serviceName} reset to CLOSED`);
        this.state = 'CLOSED';
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.threshold) {
        logger.error(`Circuit breaker for ${this.serviceName} opened after ${this.failureCount} failures`);
        this.state = 'OPEN';
      }

      throw error;
    }
  }

  public getState(): string {
    return this.state;
  }
}

/**
 * HTTP Client for making requests to microservices
 */
class HttpClient {
  private clients: Map<string, AxiosInstance> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor() {
    this.initializeClients();
    this.initializeCircuitBreakers();
  }

  private initializeClients(): void {
    Object.entries(config.services).forEach(([name, serviceConfig]) => {
      const client = axios.create({
        baseURL: serviceConfig.url,
        timeout: serviceConfig.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SOS-API-Gateway/1.0',
        },
      });

      // Request interceptor
      client.interceptors.request.use(
        (config) => {
          logger.debug(`Request to ${name}:`, {
            method: config.method,
            url: config.url,
            headers: config.headers,
          });
          return config;
        },
        (error) => {
          logger.error(`Request error for ${name}:`, error);
          return Promise.reject(error);
        }
      );

      // Response interceptor
      client.interceptors.response.use(
        (response) => {
          logger.debug(`Response from ${name}:`, {
            status: response.status,
            data: response.data,
          });
          return response;
        },
        (error) => {
          logger.error(`Response error from ${name}:`, {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
          });
          return Promise.reject(error);
        }
      );

      this.clients.set(name, client);
    });
  }

  private initializeCircuitBreakers(): void {
    Object.keys(config.services).forEach((name) => {
      const breaker = new CircuitBreaker(
        name,
        config.circuitBreaker.threshold,
        config.circuitBreaker.resetTimeout
      );
      this.circuitBreakers.set(name, breaker);
    });
  }

  /**
   * Make request with retry logic
   */
  private async makeRequestWithRetry<T>(
    serviceName: string,
    requestFn: () => Promise<AxiosResponse<T>>,
    retries: number
  ): Promise<AxiosResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          logger.warn(`Retry ${attempt}/${retries} for ${serviceName} after ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Generic request method
   */
  public async request<T>(
    serviceName: keyof typeof config.services,
    options: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const client = this.clients.get(serviceName);
    const breaker = this.circuitBreakers.get(serviceName);
    const serviceConfig = config.services[serviceName];

    if (!client) {
      throw new AppError(`Service ${serviceName} not configured`, 500, 'SERVICE_NOT_CONFIGURED');
    }

    if (!breaker) {
      throw new AppError(`Circuit breaker for ${serviceName} not initialized`, 500, 'CIRCUIT_BREAKER_ERROR');
    }

    try {
      return await breaker.execute(async () => {
        return await this.makeRequestWithRetry(
          serviceName,
          () => client.request<T>(options),
          serviceConfig.retries
        );
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return this.handleAxiosError(error, serviceName);
      }
      throw error;
    }
  }

  /**
   * Handle Axios errors and convert to AppError
   */
  private handleAxiosError(error: AxiosError, serviceName: string): never {
    if (error.response) {
      // Service responded with error status
      const status = error.response.status;
      const data = error.response.data as any;

      throw new AppError(
        data?.error || data?.message || 'Service request failed',
        status,
        data?.code || 'SERVICE_ERROR'
      );
    } else if (error.request) {
      // Request made but no response
      logger.error(`No response from ${serviceName}:`, error.message);
      throw new AppError(
        `Service ${serviceName} is not responding`,
        503,
        'SERVICE_UNAVAILABLE'
      );
    } else {
      // Error setting up request
      logger.error(`Request setup error for ${serviceName}:`, error.message);
      throw new AppError(
        'Failed to setup service request',
        500,
        'REQUEST_SETUP_ERROR'
      );
    }
  }

  /**
   * GET request
   */
  public async get<T>(
    serviceName: keyof typeof config.services,
    path: string,
    reqConfig?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.request<T>(serviceName, {
      method: 'GET',
      url: path,
      ...reqConfig,
    });
  }

  /**
   * POST request
   */
  public async post<T>(
    serviceName: keyof typeof config.services,
    path: string,
    data?: any,
    reqConfig?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.request<T>(serviceName, {
      method: 'POST',
      url: path,
      data,
      ...reqConfig,
    });
  }

  /**
   * PUT request
   */
  public async put<T>(
    serviceName: keyof typeof config.services,
    path: string,
    data?: any,
    reqConfig?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.request<T>(serviceName, {
      method: 'PUT',
      url: path,
      data,
      ...reqConfig,
    });
  }

  /**
   * PATCH request
   */
  public async patch<T>(
    serviceName: keyof typeof config.services,
    path: string,
    data?: any,
    reqConfig?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.request<T>(serviceName, {
      method: 'PATCH',
      url: path,
      data,
      ...reqConfig,
    });
  }

  /**
   * DELETE request
   */
  public async delete<T>(
    serviceName: keyof typeof config.services,
    path: string,
    reqConfig?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.request<T>(serviceName, {
      method: 'DELETE',
      url: path,
      ...reqConfig,
    });
  }

  /**
   * Get circuit breaker state for a service
   */
  public getCircuitBreakerState(serviceName: string): string {
    const breaker = this.circuitBreakers.get(serviceName);
    return breaker?.getState() || 'UNKNOWN';
  }

  /**
   * Get all circuit breaker states
   */
  public getAllCircuitBreakerStates(): Record<string, string> {
    const states: Record<string, string> = {};
    this.circuitBreakers.forEach((breaker, name) => {
      states[name] = breaker.getState();
    });
    return states;
  }
}

// Export singleton instance
export default new HttpClient();
