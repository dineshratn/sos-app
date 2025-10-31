/**
 * API client factory and core functionality
 *
 * @packageDocumentation
 */

import type { ApiClientConfig, ApiResponse, RequestConfig, HttpMethod } from './config';
import { defaultConfig, mergeConfig, defaultRetryConfig } from './config';
import type { AxiosRequestConfig, AxiosResponse, AxiosError } from './interceptors';
import {
  authRequestInterceptor,
  requestIdInterceptor,
  loggingRequestInterceptor,
  loggingResponseInterceptor,
  transformResponseInterceptor,
  errorHandlerInterceptor,
  createRetryInterceptor,
} from './interceptors';

/**
 * Logger interface (compatible with shared logger)
 */
interface Logger {
  http(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/**
 * API client class
 */
export class ApiClient {
  private config: ApiClientConfig;
  private logger?: Logger;
  private axiosInstance: any; // Axios instance (type as any for compatibility)

  constructor(config?: Partial<ApiClientConfig>, logger?: Logger) {
    this.config = mergeConfig(defaultConfig, config);
    this.logger = logger;
    this.axiosInstance = null; // Will be set when axios is available
  }

  /**
   * Initialize with Axios instance
   * This method should be called by consuming applications that have Axios installed
   */
  public initializeWithAxios(axios: any): void {
    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      withCredentials: this.config.withCredentials,
      headers: this.config.headers,
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    if (!this.axiosInstance) {
      throw new Error('Axios instance not initialized. Call initializeWithAxios() first.');
    }

    // Request interceptors
    this.axiosInstance.interceptors.request.use(
      (config: AxiosRequestConfig) => {
        // Add auth token
        config = authRequestInterceptor(config, this.config.token, this.config.tokenType);

        // Add request ID
        config = requestIdInterceptor(config);

        // Log request
        if (this.config.enableLogging && this.logger) {
          config = loggingRequestInterceptor(config, this.logger);
        }

        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Response interceptors
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log response
        if (this.config.enableLogging && this.logger) {
          response = loggingResponseInterceptor(response, this.logger);
        }

        // Transform response
        response = transformResponseInterceptor(response);

        return response;
      },
      async (error: AxiosError) => {
        // Retry logic
        if (this.config.enableRetry) {
          const retryInterceptor = createRetryInterceptor(defaultRetryConfig);
          try {
            return await retryInterceptor(error, this.axiosInstance);
          } catch (retryError) {
            error = retryError as AxiosError;
          }
        }

        // Handle error
        return errorHandlerInterceptor(error, this.logger);
      }
    );
  }

  /**
   * Set authentication token
   */
  public setToken(token: string, tokenType = 'Bearer'): void {
    this.config.token = token;
    this.config.tokenType = tokenType;
  }

  /**
   * Clear authentication token
   */
  public clearToken(): void {
    this.config.token = undefined;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ApiClientConfig>): void {
    this.config = mergeConfig(this.config, config);

    // Update axios instance if it exists
    if (this.axiosInstance) {
      this.axiosInstance.defaults.baseURL = this.config.baseURL;
      this.axiosInstance.defaults.timeout = this.config.timeout;
      this.axiosInstance.defaults.headers = {
        ...this.axiosInstance.defaults.headers,
        ...this.config.headers,
      };
    }
  }

  /**
   * Generic request method
   */
  public async request<T = unknown>(
    url: string,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    if (!this.axiosInstance) {
      throw new Error('Axios instance not initialized. Call initializeWithAxios() first.');
    }

    const axiosConfig: AxiosRequestConfig = {
      url,
      method: config?.method || 'GET',
      headers: config?.headers,
      params: config?.params,
      data: config?.data,
      timeout: config?.timeout,
    };

    const response = await this.axiosInstance.request<T>(axiosConfig);

    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    };
  }

  /**
   * GET request
   */
  public async get<T = unknown>(
    url: string,
    params?: Record<string, unknown>,
    config?: Omit<RequestConfig, 'method' | 'params'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'GET' as HttpMethod, params });
  }

  /**
   * POST request
   */
  public async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: Omit<RequestConfig, 'method' | 'data'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'POST' as HttpMethod, data });
  }

  /**
   * PUT request
   */
  public async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: Omit<RequestConfig, 'method' | 'data'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'PUT' as HttpMethod, data });
  }

  /**
   * PATCH request
   */
  public async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: Omit<RequestConfig, 'method' | 'data'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'PATCH' as HttpMethod, data });
  }

  /**
   * DELETE request
   */
  public async delete<T = unknown>(
    url: string,
    config?: Omit<RequestConfig, 'method'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'DELETE' as HttpMethod });
  }

  /**
   * Upload file (multipart/form-data)
   */
  public async upload<T = unknown>(
    url: string,
    file: File | Blob,
    fieldName = 'file',
    additionalData?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append(fieldName, file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    return this.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  /**
   * Download file
   */
  public async download(url: string, filename?: string): Promise<void> {
    if (!this.axiosInstance) {
      throw new Error('Axios instance not initialized');
    }

    const response = await this.axiosInstance.get(url, {
      responseType: 'blob',
    });

    // Create download link
    const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename || 'download');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }
}

/**
 * Create API client instance
 */
export function createApiClient(
  config?: Partial<ApiClientConfig>,
  logger?: Logger
): ApiClient {
  return new ApiClient(config, logger);
}

/**
 * Default API client instance (singleton)
 */
let defaultApiClient: ApiClient | null = null;

/**
 * Get default API client instance
 */
export function getApiClient(): ApiClient {
  if (!defaultApiClient) {
    defaultApiClient = new ApiClient();
  }
  return defaultApiClient;
}

/**
 * Initialize default API client with Axios
 */
export function initializeDefaultClient(axios: any, config?: Partial<ApiClientConfig>): void {
  if (!defaultApiClient) {
    defaultApiClient = new ApiClient(config);
  }
  defaultApiClient.initializeWithAxios(axios);
}
