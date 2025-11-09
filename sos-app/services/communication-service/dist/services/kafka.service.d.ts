/**
 * Kafka Service
 * Handles Kafka producer for publishing communication events
 */
export declare class KafkaService {
    private kafka;
    private producer;
    private isConnected;
    constructor();
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    publishEvent(topic: string, event: any): Promise<void>;
    publishMessageSentEvent(event: {
        emergencyId: string;
        messageId: string;
        senderId: string;
        messageType: string;
    }): Promise<void>;
    publishMessageDeliveredEvent(event: {
        emergencyId: string;
        messageId: string;
        userId: string;
    }): Promise<void>;
    publishMessageReadEvent(event: {
        emergencyId: string;
        messageId: string;
        userId: string;
    }): Promise<void>;
    isConnectedStatus(): boolean;
}
declare const _default: KafkaService;
export default _default;
//# sourceMappingURL=kafka.service.d.ts.map