import { AxiosRequestConfig, AxiosResponse } from 'axios';
import config from '../config';
/**
 * HTTP Client for making requests to microservices
 */
declare class HttpClient {
    private clients;
    private circuitBreakers;
    constructor();
    private initializeClients;
    private initializeCircuitBreakers;
    /**
     * Make request with retry logic
     */
    private makeRequestWithRetry;
    /**
     * Generic request method
     */
    request<T>(serviceName: keyof typeof config.services, options: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    /**
     * Handle Axios errors and convert to AppError
     */
    private handleAxiosError;
    /**
     * GET request
     */
    get<T>(serviceName: keyof typeof config.services, path: string, reqConfig?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    /**
     * POST request
     */
    post<T>(serviceName: keyof typeof config.services, path: string, data?: any, reqConfig?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    /**
     * PUT request
     */
    put<T>(serviceName: keyof typeof config.services, path: string, data?: any, reqConfig?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    /**
     * PATCH request
     */
    patch<T>(serviceName: keyof typeof config.services, path: string, data?: any, reqConfig?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    /**
     * DELETE request
     */
    delete<T>(serviceName: keyof typeof config.services, path: string, reqConfig?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    /**
     * Get circuit breaker state for a service
     */
    getCircuitBreakerState(serviceName: string): string;
    /**
     * Get all circuit breaker states
     */
    getAllCircuitBreakerStates(): Record<string, string>;
}
declare const _default: HttpClient;
export default _default;
//# sourceMappingURL=httpClient.d.ts.map