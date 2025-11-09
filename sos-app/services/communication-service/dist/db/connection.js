"use strict";
/**
 * MongoDB Connection
 * Handles MongoDB connection and lifecycle
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoDBConnection = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = __importDefault(require("../utils/logger"));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sos-communication';
class MongoDBConnection {
    constructor() {
        this.isConnected = false;
    }
    static getInstance() {
        if (!MongoDBConnection.instance) {
            MongoDBConnection.instance = new MongoDBConnection();
        }
        return MongoDBConnection.instance;
    }
    async connect() {
        if (this.isConnected) {
            logger_1.default.info('MongoDB: Already connected');
            return;
        }
        try {
            await mongoose_1.default.connect(MONGODB_URI, {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000
            });
            this.isConnected = true;
            logger_1.default.info('MongoDB: Connected successfully');
            // Handle connection events
            mongoose_1.default.connection.on('error', (error) => {
                logger_1.default.error('MongoDB connection error:', error);
                this.isConnected = false;
            });
            mongoose_1.default.connection.on('disconnected', () => {
                logger_1.default.warn('MongoDB: Disconnected');
                this.isConnected = false;
            });
            mongoose_1.default.connection.on('reconnected', () => {
                logger_1.default.info('MongoDB: Reconnected');
                this.isConnected = true;
            });
        }
        catch (error) {
            logger_1.default.error('MongoDB connection failed:', error);
            throw error;
        }
    }
    async disconnect() {
        if (!this.isConnected) {
            return;
        }
        try {
            await mongoose_1.default.connection.close();
            this.isConnected = false;
            logger_1.default.info('MongoDB: Disconnected successfully');
        }
        catch (error) {
            logger_1.default.error('MongoDB disconnect error:', error);
            throw error;
        }
    }
    getConnection() {
        return mongoose_1.default.connection;
    }
    isConnectedStatus() {
        return this.isConnected;
    }
}
exports.MongoDBConnection = MongoDBConnection;
exports.default = MongoDBConnection.getInstance();
//# sourceMappingURL=connection.js.map