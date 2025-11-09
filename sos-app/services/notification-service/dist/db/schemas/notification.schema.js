"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationBatchModel = exports.NotificationModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const Notification_1 = require("../../models/Notification");
const notificationSchema = new mongoose_1.Schema({
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
        enum: Object.values(Notification_1.NotificationChannel),
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: Object.values(Notification_1.NotificationStatus),
        required: true,
        default: Notification_1.NotificationStatus.PENDING,
        index: true,
    },
    priority: {
        type: String,
        enum: Object.values(Notification_1.NotificationPriority),
        required: true,
        default: Notification_1.NotificationPriority.NORMAL,
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
        type: mongoose_1.Schema.Types.Mixed,
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
}, {
    timestamps: true,
    collection: 'notifications',
});
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
    transform: (_doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});
exports.NotificationModel = mongoose_1.default.model('Notification', notificationSchema);
const notificationBatchSchema = new mongoose_1.Schema({
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
}, {
    timestamps: true,
    collection: 'notification_batches',
});
notificationBatchSchema.index({ createdAt: -1 });
notificationBatchSchema.index({ emergencyId: 1, createdAt: -1 });
exports.NotificationBatchModel = mongoose_1.default.model('NotificationBatch', notificationBatchSchema);
//# sourceMappingURL=notification.schema.js.map