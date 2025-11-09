import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  Notification,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
} from '../../models/Notification';

export interface NotificationDocument extends Omit<Notification, 'id'>, Document {
  _id: string;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    emergencyId: {
      type: String,
      required: true,
      index: true,
    },
    batchId: {
      type: String,
      index: true,
    },
    recipientId: {
      type: String,
      required: true,
      index: true,
    },
    recipientName: {
      type: String,
      required: true,
    },
    recipientPhone: {
      type: String,
    },
    recipientEmail: {
      type: String,
    },
    channel: {
      type: String,
      enum: Object.values(NotificationChannel),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      required: true,
      default: NotificationStatus.PENDING,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      required: true,
      default: NotificationPriority.NORMAL,
      index: true,
    },
    subject: {
      type: String,
    },
    content: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    sentAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    nextRetryAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'notifications',
  }
);

// Compound indexes for efficient queries
notificationSchema.index({ emergencyId: 1, status: 1 });
notificationSchema.index({ emergencyId: 1, channel: 1 });
notificationSchema.index({ batchId: 1, status: 1 });
notificationSchema.index({ status: 1, nextRetryAt: 1 });
notificationSchema.index({ createdAt: -1 });

// TTL index to automatically delete old notifications after 2 years
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

// Virtual for id field
notificationSchema.virtual('id').get(function () {
  return this._id.toString();
});

// Ensure virtuals are included in JSON
notificationSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret: any) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const NotificationModel: Model<NotificationDocument> = mongoose.model<NotificationDocument>(
  'Notification',
  notificationSchema
);

// Batch tracking schema
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

const notificationBatchSchema = new Schema<NotificationBatchDocument>(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    emergencyId: {
      type: String,
      required: true,
      index: true,
    },
    totalCount: {
      type: Number,
      required: true,
      default: 0,
    },
    sentCount: {
      type: Number,
      default: 0,
    },
    deliveredCount: {
      type: Number,
      default: 0,
    },
    failedCount: {
      type: Number,
      default: 0,
    },
    pendingCount: {
      type: Number,
      default: 0,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'notification_batches',
  }
);

notificationBatchSchema.index({ createdAt: -1 });
notificationBatchSchema.index({ emergencyId: 1, createdAt: -1 });

export const NotificationBatchModel: Model<NotificationBatchDocument> = mongoose.model<NotificationBatchDocument>(
  'NotificationBatch',
  notificationBatchSchema
);
