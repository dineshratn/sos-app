declare class NotificationService {
    private app;
    constructor();
    private initializeMiddleware;
    private initializeRoutes;
    private initializeErrorHandling;
    private connectDatabase;
    start(): Promise<void>;
    stop(): Promise<void>;
}
declare const notificationService: NotificationService;
export { notificationService };
//# sourceMappingURL=index.d.ts.map