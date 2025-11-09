export interface Config {
    port: number;
    nodeEnv: string;
    database: {
        url: string;
        host: string;
        port: number;
        name: string;
        username: string;
        password: string;
        ssl: boolean;
        poolMin: number;
        poolMax: number;
    };
    auth: {
        jwtSecret: string;
        jwtExpiration: string;
    };
    cors: {
        origin: string[];
        credentials: boolean;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    encryption: {
        algorithm: string;
        keyId: string;
        secretKey: string;
        ivLength: number;
    };
    kafka: {
        brokers: string[];
        clientId: string;
        groupId: string;
    };
    audit: {
        enabled: boolean;
        logLevel: string;
    };
    hipaa: {
        dataRetentionDays: number;
        accessLogRetentionDays: number;
        encryptionAtRest: boolean;
        encryptionInTransit: boolean;
    };
}
declare const config: Config;
export default config;
//# sourceMappingURL=index.d.ts.map