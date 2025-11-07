import mongoose, { Schema, Document, Model } from 'mongoose';

// Enums for message types and roles
export enum MessageType {
  TEXT = 'TEXT',
  VOICE = 'VOICE',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  LOCATION = 'LOCATION',
  QUICK_RESPONSE = 'QUICK_RESPONSE',
}

export enum SenderRole {
  USER = 'USER',
  CONTACT = 'CONTACT',
  RESPONDER = 'RESPONDER',
}

export enum QuickResponseType {
  NEED_AMBULANCE = 'NEED_AMBULANCE',
  NEED_POLICE = 'NEED_POLICE',
  NEED_FIRE = 'NEED_FIRE',
  TRAPPED = 'TRAPPED',
  INJURED = 'INJURED',
  SAFE_NOW = 'SAFE_NOW',
  CALL_ME = 'CALL_ME',
}

// Message metadata interface
export interface MessageMetadata {
  mediaUrl?: string;
  thumbnailUrl?: string;
  transcription?: string;
  duration?: number; // for voice/video in seconds
  fileSize?: number;
  mimeType?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  quickResponseType?: QuickResponseType;
}

// Message document interface
export interface IMessage extends Document {
  _id: string;
  emergencyId: string;
  senderId: string;
  senderName: string;
  senderRole: SenderRole;
  type: MessageType;
  content: string;
  metadata?: MessageMetadata;
  delivered: boolean;
  read: boolean;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Message schema definition
const MessageSchema: Schema = new Schema(
  {
    emergencyId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
      index: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderRole: {
      type: String,
      enum: Object.values(SenderRole),
      required: true,
      default: SenderRole.USER,
    },
    type: {
      type: String,
      enum: Object.values(MessageType),
      required: true,
      default: MessageType.TEXT,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    metadata: {
      mediaUrl: String,
      thumbnailUrl: String,
      transcription: String,
      duration: Number,
      fileSize: Number,
      mimeType: String,
      location: {
        latitude: Number,
        longitude: Number,
        accuracy: Number,
      },
      quickResponseType: {
        type: String,
        enum: Object.values(QuickResponseType),
      },
    },
    delivered: {
      type: Boolean,
      default: false,
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
    deletedAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'messages',
  }
);

// Compound indexes for efficient queries
MessageSchema.index({ emergencyId: 1, createdAt: -1 });
MessageSchema.index({ emergencyId: 1, delivered: 1 });
MessageSchema.index({ emergencyId: 1, read: 1 });

// TTL index to automatically delete messages after retention period (90 days)
MessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Virtual for message ID
MessageSchema.virtual('id').get(function (this: IMessage) {
  return this._id.toString();
});

// Ensure virtuals are included in JSON
MessageSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// Static methods
MessageSchema.statics = {
  /**
   * Get messages for an emergency with pagination
   */
  async getMessagesByEmergencyId(
    emergencyId: string,
    limit: number = 50,
    before?: Date
  ): Promise<IMessage[]> {
    const query: any = {
      emergencyId,
      deletedAt: { $exists: false },
    };

    if (before) {
      query.createdAt = { $lt: before };
    }

    return this.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  },

  /**
   * Get undelivered messages for a user
   */
  async getUndeliveredMessages(emergencyId: string): Promise<IMessage[]> {
    return this.find({
      emergencyId,
      delivered: false,
      deletedAt: { $exists: false },
    })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
  },

  /**
   * Mark message as delivered
   */
  async markAsDelivered(messageId: string): Promise<IMessage | null> {
    return this.findByIdAndUpdate(
      messageId,
      {
        delivered: true,
        deliveredAt: new Date(),
      },
      { new: true }
    ).exec();
  },

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<IMessage | null> {
    return this.findByIdAndUpdate(
      messageId,
      {
        read: true,
        readAt: new Date(),
      },
      { new: true }
    ).exec();
  },

  /**
   * Soft delete message
   */
  async softDelete(messageId: string): Promise<IMessage | null> {
    return this.findByIdAndUpdate(
      messageId,
      { deletedAt: new Date() },
      { new: true }
    ).exec();
  },
};

// Instance methods
MessageSchema.methods = {
  /**
   * Check if message belongs to a user
   */
  belongsTo(userId: string): boolean {
    return this.senderId === userId;
  },

  /**
   * Get message age in minutes
   */
  getAgeInMinutes(): number {
    return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60));
  },
};

// Pre-save middleware
MessageSchema.pre<IMessage>('save', function (next) {
  // Validate message content length
  if (this.content && this.content.length > 5000) {
    return next(new Error('Message content exceeds maximum length of 5000 characters'));
  }

  // Set delivered timestamp if delivered flag is true
  if (this.delivered && !this.deliveredAt) {
    this.deliveredAt = new Date();
  }

  // Set read timestamp if read flag is true
  if (this.read && !this.readAt) {
    this.readAt = new Date();
  }

  next();
});

// Create and export the model
const Message: Model<IMessage> = mongoose.model<IMessage>('Message', MessageSchema);

export default Message;
