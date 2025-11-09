import { Document, Model } from 'mongoose';
import { Notification } from '../../models/Notification';
export interface NotificationDocument extends Omit<Notification, 'id'>, Document {
    _id: string;
}
export declare const NotificationModel: Model<NotificationDocument>;
export interface NotificationBatchDocument extends Document {
    batchId: string;
    emergencyId: string;
    totalCount: number;
    sentCount: number;
    deliveredCount: number;
    failedCount: number;
    pendingCount: number;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
}
export declare const NotificationBatchModel: Model<NotificationBatchDocument>;
//# sourceMappingURL=notification.schema.d.ts.map