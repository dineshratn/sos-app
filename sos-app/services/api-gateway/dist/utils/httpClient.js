"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("./logger"));
const errorHandler_1 = require("../middleware/errorHandler");
/**
 * Circuit Breaker implementation for service calls
 */
class CircuitBreaker {
    serviceName;
    threshold;
    resetTimeout;
    failureCount = 0;
    lastFailureTime = 0;
    state = 'CLOSED';
    constructor(serviceName, threshold, resetTimeout) {
        this.serviceName = serviceName;
        this.threshold = threshold;
        this.resetTimeout = resetTimeout;
    }
    async execute(fn) {
        if (!config_1.default.circuitBreaker.enabled) {
            return fn();
        }
        if (this.state === 'OPEN') {
            const timeSinceLastFailure = Date.now() - this.lastFailureTime;
            if (timeSinceLastFailure > this.resetTimeout) {
                logger_1.default.info(`Circuit breaker for ${this.serviceName} moving to HALF_OPEN`);
                this.state = 'HALF_OPEN';
            }
            else {
                throw new errorHandler_1.AppError(`Service ${this.serviceName} is temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE');
            }
        }
        try {
            const result = await fn();
            if (this.state === 'HALF_OPEN') {
                logger_1.default.info(`Circuit breaker for ${this.serviceName} reset to CLOSED`);
                this.state = 'CLOSED';
                this.failureCount = 0;
            }
            return result;
        }
        catch (error) {
            this.failureCount++;
            this.lastFailureTime = Date.now();
            if (this.failureCount >= this.threshold) {
                logger_1.default.error(`Circuit breaker for ${this.serviceName} opened after ${this.failureCount} failures`);
                this.state = 'OPEN';
            }
            throw error;
        }
    }
    getState() {
        return this.state;
    }
}
/**
 * HTTP Client for making requests to microservices
 */
class HttpClient {
    clients = new Map();
    circuitBreakers = new Map();
    constructor() {
        this.initializeClients();
        this.initializeCircuitBreakers();
    }
    initializeClients() {
        Object.entries(config_1.default.services).forEach(([name, serviceConfig]) => {
            const client = axios_1.default.create({
                baseURL: serviceConfig.url,
                timeout: serviceConfig.timeout,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'SOS-API-Gateway/1.0',
                },
            });
            // Request interceptor
            client.interceptors.request.use((config) => {
                logger_1.default.debug(`Request to ${name}:`, {
                    method: config.method,
                    url: config.url,
                    headers: config.headers,
                });
                return config;
            }, (error) => {
                logger_1.default.error(`Request error for ${name}:`, error);
                return Promise.reject(error);
            });
            // Response interceptor
            client.interceptors.response.use((response) => {
                logger_1.default.debug(`Response from ${name}:`, {
                    status: response.status,
                    data: response.data,
                });
                return response;
            }, (error) => {
                logger_1.default.error(`Response error from ${name}:`, {
                    message: error.message,
                    status: error.response?.status,
                    data: error.response?.data,
                });
                return Promise.reject(error);
            });
            this.clients.set(name, client);
        });
    }
    initializeCircuitBreakers() {
        Object.keys(config_1.default.services).forEach((name) => {
            const breaker = new CircuitBreaker(name, config_1.default.circuitBreaker.threshold, config_1.default.circuitBreaker.resetTimeout);
            this.circuitBreakers.set(name, breaker);
        });
    }
    /**
     * Make request with retry logic
     */
    async makeRequestWithRetry(serviceName, requestFn, retries) {
        let lastError = null;
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await requestFn();
            }
            catch (error) {
                lastError = error;
                if (attempt < retries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                    logger_1.default.warn(`Retry ${attempt}/${retries} for ${serviceName} after ${delay}ms`);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError;
    }
    /**
     * Generic request method
     */
    async request(serviceName, options) {
        const client = this.clients.get(serviceName);
        const breaker = this.circuitBreakers.get(serviceName);
        const serviceConfig = config_1.default.services[serviceName];
        if (!client) {
            throw new errorHandler_1.AppError(`Service ${serviceName} not configured`, 500, 'SERVICE_NOT_CONFIGURED');
        }
        if (!breaker) {
            throw new errorHandler_1.AppError(`Circuit breaker for ${serviceName} not initialized`, 500, 'CIRCUIT_BREAKER_ERROR');
        }
        try {
            return await breaker.execute(async () => {
                return await this.makeRequestWithRetry(serviceName, () => client.request(options), serviceConfig.retries);
            });
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                return this.handleAxiosError(error, serviceName);
            }
            throw error;
        }
    }
    /**
     * Handle Axios errors and convert to AppError
     */
    handleAxiosError(error, serviceName) {
        if (error.response) {
            // Service responded with error status
            const status = error.response.status;
            const data = error.response.data;
            throw new errorHandler_1.AppError(data?.error || data?.message || 'Service request failed', status, data?.code || 'SERVICE_ERROR');
        }
        else if (error.request) {
            // Request made but no response
            logger_1.default.error(`No response from ${serviceName}:`, error.message);
            throw new errorHandler_1.AppError(`Service ${serviceName} is not responding`, 503, 'SERVICE_UNAVAILABLE');
        }
        else {
            // Error setting up request
            logger_1.default.error(`Request setup error for ${serviceName}:`, error.message);
            throw new errorHandler_1.AppError('Failed to setup service request', 500, 'REQUEST_SETUP_ERROR');
        }
    }
    /**
     * GET request
     */
    async get(serviceName, path, reqConfig) {
        return this.request(serviceName, {
            method: 'GET',
            url: path,
            ...reqConfig,
        });
    }
    /**
     * POST request
     */
    async post(serviceName, path, data, reqConfig) {
        return this.request(serviceName, {
            method: 'POST',
            url: path,
            data,
            ...reqConfig,
        });
    }
    /**
     * PUT request
     */
    async put(serviceName, path, data, reqConfig) {
        return this.request(serviceName, {
            method: 'PUT',
            url: path,
            data,
            ...reqConfig,
        });
    }
    /**
     * PATCH request
     */
    async patch(serviceName, path, data, reqConfig) {
        return this.request(serviceName, {
            method: 'PATCH',
            url: path,
            data,
            ...reqConfig,
        });
    }
    /**
     * DELETE request
     */
    async delete(serviceName, path, reqConfig) {
        return this.request(serviceName, {
            method: 'DELETE',
            url: path,
            ...reqConfig,
        });
    }
    /**
     * Get circuit breaker state for a service
     */
    getCircuitBreakerState(serviceName) {
        const breaker = this.circuitBreakers.get(serviceName);
        return breaker?.getState() || 'UNKNOWN';
    }
    /**
     * Get all circuit breaker states
     */
    getAllCircuitBreakerStates() {
        const states = {};
        this.circuitBreakers.forEach((breaker, name) => {
            states[name] = breaker.getState();
        });
        return states;
    }
}
// Export singleton instance
exports.default = new HttpClient();
//# sourceMappingURL=httpClient.js.map