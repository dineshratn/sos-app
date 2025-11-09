export interface ServiceConfig {
    url: string;
    timeout: number;
    retries: number;
}
interface Config {
    nodeEnv: string;
    serviceName: string;
    port: number;
    services: {
        auth: ServiceConfig;
        user: ServiceConfig;
        emergency: ServiceConfig;
        location: ServiceConfig;
        notification: ServiceConfig;
        communication: ServiceConfig;
        llm: ServiceConfig;
    };
    cors: {
        origins: string[];
        credentials: boolean;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    redis: {
        host: string;
        port: number;
        password?: string;
        db: number;
    };
    logging: {
        level: string;
        format: string;
    };
    timeout: {
        default: number;
        upload: number;
    };
    circuitBreaker: {
        enabled: boolean;
        threshold: number;
        timeout: number;
        resetTimeout: number;
    };
}
declare const config: Config;
export default config;
//# sourceMappingURL=index.d.ts.map