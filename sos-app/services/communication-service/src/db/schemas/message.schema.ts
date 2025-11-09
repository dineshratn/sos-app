/**
 * MongoDB Schema for Messages
 * Task 125: Mongoose schema with TTL index for 90-day auto-deletion
 */

import mongoose, { Schema, Document } from 'mongoose';
import {
  Message,
  MessageType,
  MessageStatus,
  SenderRole,
  QuickResponseType
} from '../../models/Message';

export interface MessageDocument extends Omit<Message, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const MessageMetadataSchema = new Schema(
  {
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
      enum: Object.values(QuickResponseType)
    },

    // System message
    systemMessageType: { type: String },
    systemMessageData: { type: Schema.Types.Mixed },

    // General
    fileName: { type: String },
    originalName: { type: String },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    replyToMessageId: { type: String }
  },
  { _id: false }
);

const MessageSchema = new Schema<MessageDocument>(
  {
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
      enum: Object.values(SenderRole),
      required: true,
      default: SenderRole.USER
    },
    type: {
      type: String,
      enum: Object.values(MessageType),
      required: true,
      default: MessageType.TEXT
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
      enum: Object.values(MessageStatus),
      default: MessageStatus.SENT
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
  },
  {
    timestamps: true,
    collection: 'messages'
  }
);

// Compound indexes for efficient queries
MessageSchema.index({ emergencyId: 1, createdAt: -1 });
MessageSchema.index({ emergencyId: 1, senderId: 1 });
MessageSchema.index({ emergencyId: 1, type: 1 });

// TTL index for 90-day auto-deletion (90 days = 7776000 seconds)
MessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// Virtual for id (to map _id to id in responses)
MessageSchema.virtual('id').get(function (this: MessageDocument) {
  return this._id.toHexString();
});

// Ensure virtuals are included in JSON
MessageSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (_doc, ret) {
    ret.id = ret._id.toHexString();
    delete (ret as any)._id;
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
MessageSchema.statics.findByEmergency = function (
  emergencyId: string,
  limit: number = 50,
  offset: number = 0
) {
  return this.find({ emergencyId })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
};

MessageSchema.statics.findByEmergencyWithPagination = function (
  emergencyId: string,
  options: {
    limit?: number;
    offset?: number;
    before?: Date;
    after?: Date;
  } = {}
) {
  const query: any = { emergencyId };

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

MessageSchema.statics.countByEmergency = function (emergencyId: string) {
  return this.countDocuments({ emergencyId });
};

MessageSchema.statics.markAsDelivered = function (messageId: string, userId: string) {
  return this.findByIdAndUpdate(
    messageId,
    {
      $addToSet: { deliveredTo: userId },
      $set: { status: MessageStatus.DELIVERED }
    },
    { new: true }
  );
};

MessageSchema.statics.markAsRead = function (messageId: string, userId: string) {
  return this.findByIdAndUpdate(
    messageId,
    {
      $addToSet: { readBy: userId },
      $set: { status: MessageStatus.READ }
    },
    { new: true }
  );
};

// Create and export model
const MessageModel = mongoose.model<MessageDocument>('Message', MessageSchema);

export default MessageModel;
