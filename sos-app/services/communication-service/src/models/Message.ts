/**
 * Message Model
 * Represents a message in an emergency communication room
 * Task 124: Message model with comprehensive typing
 */

export interface Message {
  id?: string;
  emergencyId: string;
  senderId: string;
  senderRole: SenderRole;
  type: MessageType;
  content: string;
  metadata?: MessageMetadata;
  status?: MessageStatus;
  deliveredTo?: string[];
  readBy?: string[];
  createdAt: Date;
  updatedAt?: Date;
}

export enum SenderRole {
  USER = 'USER',
  CONTACT = 'CONTACT',
  RESPONDER = 'RESPONDER',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM'
}

export enum MessageType {
  TEXT = 'TEXT',
  VOICE = 'VOICE',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  LOCATION = 'LOCATION',
  QUICK_RESPONSE = 'QUICK_RESPONSE',
  SYSTEM = 'SYSTEM'
}

export enum MessageStatus {
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

export interface MessageMetadata {
  // For media messages (image, video, voice)
  mediaUrl?: string;
  mediaType?: string;
  mediaSize?: number;
  mediaDuration?: number; // For voice/video in seconds
  thumbnailUrl?: string;

  // For location messages
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  address?: string;

  // For voice messages
  transcription?: string;
  transcriptionConfidence?: number;

  // For quick responses
  quickResponseType?: QuickResponseType;

  // For system messages
  systemMessageType?: string;
  systemMessageData?: Record<string, any>;

  // General
  fileName?: string;
  originalName?: string;
  isEdited?: boolean;
  editedAt?: Date;
  replyToMessageId?: string;
}

export enum QuickResponseType {
  NEED_AMBULANCE = 'NEED_AMBULANCE',
  NEED_POLICE = 'NEED_POLICE',
  NEED_FIRE = 'NEED_FIRE',
  TRAPPED = 'TRAPPED',
  FIRE = 'FIRE',
  SAFE_NOW = 'SAFE_NOW',
  NEED_HELP = 'NEED_HELP',
  SEND_LOCATION = 'SEND_LOCATION'
}

// Request/Response types for Socket.IO events

export interface SendMessageRequest {
  emergencyId: string;
  senderId: string;
  type: MessageType;
  content: string;
  metadata?: MessageMetadata;
}

export interface SendMessageResponse {
  success: boolean;
  message?: Message;
  error?: string;
}

export interface MessageEvent {
  event: 'message:new' | 'message:updated' | 'message:deleted';
  emergencyId: string;
  message: Message;
  timestamp: Date;
}

export interface TypingEvent {
  emergencyId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: Date;
}

export interface DeliveryReceiptRequest {
  emergencyId: string;
  messageId: string;
  userId: string;
  status: 'delivered' | 'read';
}

export interface MessageHistoryQuery {
  emergencyId: string;
  limit?: number;
  offset?: number;
  before?: Date;
  after?: Date;
}

export interface MessageHistoryResponse {
  success: boolean;
  messages: Message[];
  total: number;
  hasMore: boolean;
  error?: string;
}

export interface OfflineSyncRequest {
  emergencyId: string;
  messages: Omit<Message, 'id' | 'createdAt'>[];
}

export interface OfflineSyncResponse {
  success: boolean;
  syncedMessages: Message[];
  failedMessages: string[];
  error?: string;
}

// Kafka event types
export interface MessageSentEvent {
  eventType: 'MessageSent';
  emergencyId: string;
  messageId: string;
  senderId: string;
  messageType: MessageType;
  timestamp: Date;
}

export interface MessageDeliveredEvent {
  eventType: 'MessageDelivered';
  emergencyId: string;
  messageId: string;
  userId: string;
  timestamp: Date;
}

export interface MessageReadEvent {
  eventType: 'MessageRead';
  emergencyId: string;
  messageId: string;
  userId: string;
  timestamp: Date;
}
