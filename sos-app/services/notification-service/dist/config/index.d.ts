export declare const config: {
    server: {
        port: number;
        env: string;
    };
    mongodb: {
        uri: string;
        maxPoolSize: number;
    };
    redis: {
        host: string;
        port: number;
        password: string | undefined;
        db: number;
    };
    kafka: {
        brokers: string[];
        clientId: string;
        groupId: string;
        topics: {
            emergencyCreated: string;
            escalation: string;
        };
    };
    fcm: {
        projectId: string;
        privateKey: string;
        clientEmail: string;
    };
    apns: {
        keyId: string;
        teamId: string;
        keyPath: string;
        production: boolean;
    };
    twilio: {
        accountSid: string;
        authToken: string;
        phoneNumber: string;
    };
    sendgrid: {
        apiKey: string;
        fromEmail: string;
        fromName: string;
    };
    notification: {
        retryAttempts: number;
        retryBackoffMultiplier: number;
        initialRetryDelay: number;
        maxRetryDelay: number;
        escalationTimeout: number;
        followupInterval: number;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    logging: {
        level: string;
    };
};
//# sourceMappingURL=index.d.ts.map