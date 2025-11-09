export declare enum NotificationChannel {
    PUSH = "PUSH",
    SMS = "SMS",
    EMAIL = "EMAIL",
    WEBSOCKET = "WEBSOCKET"
}
export declare enum NotificationStatus {
    PENDING = "PENDING",
    QUEUED = "QUEUED",
    SENT = "SENT",
    DELIVERED = "DELIVERED",
    FAILED = "FAILED",
    RETRY = "RETRY"
}
export declare enum NotificationPriority {
    LOW = "LOW",
    NORMAL = "NORMAL",
    HIGH = "HIGH",
    EMERGENCY = "EMERGENCY"
}
export interface NotificationMetadata {
    fcmToken?: string;
    apnsToken?: string;
    messageId?: string;
    deliveryReceipt?: string;
    errorCode?: string;
    errorMessage?: string;
    provider?: string;
    [key: string]: any;
}
export interface Notification {
    id: string;
    emergencyId: string;
    batchId?: string;
    recipientId: string;
    recipientName: string;
    recipientPhone?: string;
    recipientEmail?: string;
    channel: NotificationChannel;
    status: NotificationStatus;
    priority: NotificationPriority;
    subject?: string;
    content: string;
    metadata?: NotificationMetadata;
    sentAt?: Date;
    deliveredAt?: Date;
    failedAt?: Date;
    failureReason?: string;
    retryCount: number;
    maxRetries: number;
    nextRetryAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface EmergencyContact {
    id: string;
    name: string;
    phoneNumber?: string;
    email?: string;
    priority: 'PRIMARY' | 'SECONDARY' | 'TERTIARY';
    fcmToken?: string;
    apnsToken?: string;
}
export interface Emergency {
    id: string;
    userId: string;
    userName: string;
    emergencyType: string;
    status: string;
    location: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    initialMessage?: string;
    contacts: EmergencyContact[];
    createdAt: Date;
}
export interface NotificationJob {
    emergencyId: string;
    batchId: string;
    recipientId: string;
    recipientName: string;
    channel: NotificationChannel;
    priority: NotificationPriority;
    templateData: {
        userName: string;
        emergencyType: string;
        location: string;
        address?: string;
        emergencyLink: string;
        [key: string]: any;
    };
    contactInfo: {
        phone?: string;
        email?: string;
        fcmToken?: string;
        apnsToken?: string;
    };
}
export interface DeliveryStatus {
    notificationId: string;
    status: NotificationStatus;
    deliveredAt?: Date;
    failureReason?: string;
    metadata?: NotificationMetadata;
}
export interface NotificationBatch {
    batchId: string;
    emergencyId: string;
    totalCount: number;
    sentCount: number;
    deliveredCount: number;
    failedCount: number;
    pendingCount: number;
    createdAt: Date;
    completedAt?: Date;
}
//# sourceMappingURL=Notification.d.ts.map