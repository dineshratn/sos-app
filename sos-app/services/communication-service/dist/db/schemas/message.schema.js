"use strict";
/**
 * MongoDB Schema for Messages
 * Task 125: Mongoose schema with TTL index for 90-day auto-deletion
 */
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
const mongoose_1 = __importStar(require("mongoose"));
const Message_1 = require("../../models/Message");
const MessageMetadataSchema = new mongoose_1.Schema({
    // Media metadata
    mediaUrl: { type: String },
    mediaType: { type: String },
    mediaSize: { type: Number },
    mediaDuration: { type: Number },
    thumbnailUrl: { type: String },
    // Location metadata
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number },
    address: { type: String },
    // Voice transcription
    transcription: { type: String },
    transcriptionConfidence: { type: Number },
    // Quick response
    quickResponseType: {
        type: String,
        enum: Object.values(Message_1.QuickResponseType)
    },
    // System message
    systemMessageType: { type: String },
    systemMessageData: { type: mongoose_1.Schema.Types.Mixed },
    // General
    fileName: { type: String },
    originalName: { type: String },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    replyToMessageId: { type: String }
}, { _id: false });
const MessageSchema = new mongoose_1.Schema({
    emergencyId: {
        type: String,
        required: true,
        index: true
    },
    senderId: {
        type: String,
        required: true,
        index: true
    },
    senderRole: {
        type: String,
        enum: Object.values(Message_1.SenderRole),
        required: true,
        default: Message_1.SenderRole.USER
    },
    type: {
        type: String,
        enum: Object.values(Message_1.MessageType),
        required: true,
        default: Message_1.MessageType.TEXT
    },
    content: {
        type: String,
        required: true,
        maxlength: 10000
    },
    metadata: {
        type: MessageMetadataSchema,
        default: {}
    },
    status: {
        type: String,
        enum: Object.values(Message_1.MessageStatus),
        default: Message_1.MessageStatus.SENT
    },
    deliveredTo: [{
            type: String
        }],
    readBy: [{
            type: String
        }],
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'messages'
});
// Compound indexes for efficient queries
MessageSchema.index({ emergencyId: 1, createdAt: -1 });
MessageSchema.index({ emergencyId: 1, senderId: 1 });
MessageSchema.index({ emergencyId: 1, type: 1 });
// TTL index for 90-day auto-deletion (90 days = 7776000 seconds)
MessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });
// Virtual for id (to map _id to id in responses)
MessageSchema.virtual('id').get(function () {
    return this._id.toHexString();
});
// Ensure virtuals are included in JSON
MessageSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (_doc, ret) {
        ret.id = ret._id.toHexString();
        delete ret._id;
        return ret;
    }
});
// Pre-save middleware to update timestamps
MessageSchema.pre('save', function (next) {
    if (this.isModified() && !this.isNew) {
        this.updatedAt = new Date();
    }
    next();
});
// Static methods
MessageSchema.statics.findByEmergency = function (emergencyId, limit = 50, offset = 0) {
    return this.find({ emergencyId })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean();
};
MessageSchema.statics.findByEmergencyWithPagination = function (emergencyId, options = {}) {
    const query = { emergencyId };
    if (options.before) {
        query.createdAt = { ...query.createdAt, $lt: options.before };
    }
    if (options.after) {
        query.createdAt = { ...query.createdAt, $gt: options.after };
    }
    return this.find(query)
        .sort({ createdAt: -1 })
        .skip(options.offset || 0)
        .limit(options.limit || 50)
        .lean();
};
MessageSchema.statics.countByEmergency = function (emergencyId) {
    return this.countDocuments({ emergencyId });
};
MessageSchema.statics.markAsDelivered = function (messageId, userId) {
    return this.findByIdAndUpdate(messageId, {
        $addToSet: { deliveredTo: userId },
        $set: { status: Message_1.MessageStatus.DELIVERED }
    }, { new: true });
};
MessageSchema.statics.markAsRead = function (messageId, userId) {
    return this.findByIdAndUpdate(messageId, {
        $addToSet: { readBy: userId },
        $set: { status: Message_1.MessageStatus.READ }
    }, { new: true });
};
// Create and export model
const MessageModel = mongoose_1.default.model('Message', MessageSchema);
exports.default = MessageModel;
//# sourceMappingURL=message.schema.js.map