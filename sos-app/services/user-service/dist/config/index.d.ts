interface Config {
    nodeEnv: string;
    serviceName: string;
    port: number;
    database: {
        host: string;
        port: number;
        name: string;
        user: string;
        password: string;
        dialect: 'postgres';
        pool: {
            max: number;
            min: number;
            acquire: number;
            idle: number;
        };
        logging: boolean;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    auth: {
        jwtSecret: string;
    };
    authService: {
        url: string;
        timeout: number;
    };
    cors: {
        origins: string[];
        credentials: boolean;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    logging: {
        level: string;
        format: string;
    };
    emergencyContacts: {
        maxContacts: number;
    };
}
declare const config: Config;
export default config;
//# sourceMappingURL=index.d.ts.map