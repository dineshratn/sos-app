/**
 * Receipt Handler
 * Task 134: Handle message:delivered and message:read events
 * Updates message status in MongoDB and publishes to Kafka
 */
import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../../middleware/auth.middleware';
import { DeliveryReceiptRequest } from '../../models/Message';
export declare class ReceiptHandler {
    private io;
    private receiptSchema;
    constructor(io: Server);
    /**
     * Handle message:delivered event
     * Marks message as delivered to a specific user
     */
    handleMessageDelivered(socket: AuthenticatedSocket, data: DeliveryReceiptRequest): Promise<void>;
    /**
     * Handle message:read event
     * Marks message as read by a specific user
     */
    handleMessageRead(socket: AuthenticatedSocket, data: DeliveryReceiptRequest): Promise<void>;
    /**
     * Handle batch delivery receipts
     * Marks multiple messages as delivered at once
     */
    handleBatchDelivered(socket: AuthenticatedSocket, data: {
        emergencyId: string;
        messageIds: string[];
        userId: string;
    }): Promise<void>;
    /**
     * Handle batch read receipts
     * Marks multiple messages as read at once
     */
    handleBatchRead(socket: AuthenticatedSocket, data: {
        emergencyId: string;
        messageIds: string[];
        userId: string;
    }): Promise<void>;
    /**
     * Register all receipt-related event handlers
     */
    registerHandlers(socket: AuthenticatedSocket): void;
}
//# sourceMappingURL=receipt.handler.d.ts.map