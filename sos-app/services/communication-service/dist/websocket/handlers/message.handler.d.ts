/**
 * Message Handler
 * Task 128: Handle sending/receiving messages with validation, persistence, and Kafka events
 */
import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../../middleware/auth.middleware';
import { SendMessageRequest, SendMessageResponse } from '../../models/Message';
export declare class MessageHandler {
    private io;
    private sendMessageSchema;
    constructor(io: Server);
    /**
     * Handle sending a new message
     * Validates, saves to MongoDB, broadcasts to room, and publishes to Kafka
     */
    handleSendMessage(socket: AuthenticatedSocket, data: SendMessageRequest, callback: (response: SendMessageResponse) => void): Promise<void>;
    /**
     * Handle editing a message
     */
    handleEditMessage(socket: AuthenticatedSocket, data: {
        messageId: string;
        content: string;
        emergencyId: string;
    }, callback: (response: SendMessageResponse) => void): Promise<void>;
    /**
     * Handle deleting a message
     */
    handleDeleteMessage(socket: AuthenticatedSocket, data: {
        messageId: string;
        emergencyId: string;
    }, callback: (response: {
        success: boolean;
        error?: string;
    }) => void): Promise<void>;
    /**
     * Determine sender role from user role
     */
    private determineSenderRole;
    /**
     * Register all message-related event handlers
     */
    registerHandlers(socket: AuthenticatedSocket): void;
}
//# sourceMappingURL=message.handler.d.ts.map