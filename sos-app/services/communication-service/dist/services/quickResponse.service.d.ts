/**
 * Quick Response Service
 * Task 130: Predefined quick responses for emergency situations
 */
import { QuickResponseType, MessageMetadata } from '../models/Message';
export interface QuickResponse {
    type: QuickResponseType;
    displayText: string;
    messageContent: string;
    icon?: string;
    priority?: 'high' | 'medium' | 'low';
    metadata?: Partial<MessageMetadata>;
}
export declare class QuickResponseService {
    private quickResponses;
    constructor();
    /**
     * Initialize predefined quick responses
     */
    private initializeQuickResponses;
    /**
     * Get a quick response by type
     */
    getQuickResponse(type: QuickResponseType): QuickResponse | undefined;
    /**
     * Get all available quick responses
     */
    getAllQuickResponses(): QuickResponse[];
    /**
     * Get high priority quick responses
     */
    getHighPriorityResponses(): QuickResponse[];
    /**
     * Generate message content from quick response type
     */
    generateMessageContent(type: QuickResponseType, customData?: Record<string, any>): {
        content: string;
        metadata: MessageMetadata;
    };
    /**
     * Validate quick response type
     */
    isValidQuickResponseType(type: string): type is QuickResponseType;
    /**
     * Add custom quick response (for extensibility)
     */
    addCustomQuickResponse(response: QuickResponse): void;
    /**
     * Remove quick response
     */
    removeQuickResponse(type: QuickResponseType): boolean;
}
declare const _default: QuickResponseService;
export default _default;
//# sourceMappingURL=quickResponse.service.d.ts.map