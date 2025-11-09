/**
 * MongoDB Connection
 * Handles MongoDB connection and lifecycle
 */
import mongoose from 'mongoose';
export declare class MongoDBConnection {
    private static instance;
    private isConnected;
    private constructor();
    static getInstance(): MongoDBConnection;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getConnection(): mongoose.Connection;
    isConnectedStatus(): boolean;
}
declare const _default: MongoDBConnection;
export default _default;
//# sourceMappingURL=connection.d.ts.map