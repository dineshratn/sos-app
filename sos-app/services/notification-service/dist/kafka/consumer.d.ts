/**
 * Initialize and start Kafka consumer
 */
export declare function startKafkaConsumer(): Promise<void>;
/**
 * Stop Kafka consumer gracefully
 */
export declare function stopKafkaConsumer(): Promise<void>;
/**
 * Get consumer status
 */
export declare function getConsumerStatus(): {
    connected: boolean;
    running: boolean;
};
//# sourceMappingURL=consumer.d.ts.map