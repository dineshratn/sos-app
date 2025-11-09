"use strict";
/**
 * Quick Response Service
 * Task 130: Predefined quick responses for emergency situations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickResponseService = void 0;
const Message_1 = require("../models/Message");
const logger_1 = __importDefault(require("../utils/logger"));
class QuickResponseService {
    constructor() {
        this.quickResponses = new Map();
        this.initializeQuickResponses();
    }
    /**
     * Initialize predefined quick responses
     */
    initializeQuickResponses() {
        const responses = [
            {
                type: Message_1.QuickResponseType.NEED_AMBULANCE,
                displayText: 'Need Ambulance',
                messageContent: 'I need an ambulance urgently!',
                icon: '🚑',
                priority: 'high'
            },
            {
                type: Message_1.QuickResponseType.NEED_POLICE,
                displayText: 'Need Police',
                messageContent: 'I need police assistance!',
                icon: '🚔',
                priority: 'high'
            },
            {
                type: Message_1.QuickResponseType.NEED_FIRE,
                displayText: 'Need Fire Department',
                messageContent: 'I need the fire department!',
                icon: '🚒',
                priority: 'high'
            },
            {
                type: Message_1.QuickResponseType.TRAPPED,
                displayText: 'I am Trapped',
                messageContent: 'I am trapped and cannot move!',
                icon: '🆘',
                priority: 'high'
            },
            {
                type: Message_1.QuickResponseType.FIRE,
                displayText: 'Fire Emergency',
                messageContent: 'There is a fire!',
                icon: '🔥',
                priority: 'high'
            },
            {
                type: Message_1.QuickResponseType.SAFE_NOW,
                displayText: 'I am Safe Now',
                messageContent: 'I am safe now, situation under control.',
                icon: '✅',
                priority: 'medium'
            },
            {
                type: Message_1.QuickResponseType.NEED_HELP,
                displayText: 'Need Help',
                messageContent: 'I need help!',
                icon: '🆘',
                priority: 'high'
            },
            {
                type: Message_1.QuickResponseType.SEND_LOCATION,
                displayText: 'Send Location',
                messageContent: 'Here is my location',
                icon: '📍',
                priority: 'high'
            }
        ];
        responses.forEach((response) => {
            this.quickResponses.set(response.type, response);
        });
        logger_1.default.info(`Initialized ${this.quickResponses.size} quick response templates`);
    }
    /**
     * Get a quick response by type
     */
    getQuickResponse(type) {
        return this.quickResponses.get(type);
    }
    /**
     * Get all available quick responses
     */
    getAllQuickResponses() {
        return Array.from(this.quickResponses.values());
    }
    /**
     * Get high priority quick responses
     */
    getHighPriorityResponses() {
        return Array.from(this.quickResponses.values()).filter((response) => response.priority === 'high');
    }
    /**
     * Generate message content from quick response type
     */
    generateMessageContent(type, customData) {
        const quickResponse = this.quickResponses.get(type);
        if (!quickResponse) {
            logger_1.default.warn(`Quick response type not found: ${type}`);
            return {
                content: 'Quick response',
                metadata: { quickResponseType: type }
            };
        }
        // Build metadata
        const metadata = {
            quickResponseType: type,
            ...quickResponse.metadata,
            ...customData
        };
        logger_1.default.info(`Generated quick response message for type: ${type}`);
        return {
            content: quickResponse.messageContent,
            metadata
        };
    }
    /**
     * Validate quick response type
     */
    isValidQuickResponseType(type) {
        return Object.values(Message_1.QuickResponseType).includes(type);
    }
    /**
     * Add custom quick response (for extensibility)
     */
    addCustomQuickResponse(response) {
        this.quickResponses.set(response.type, response);
        logger_1.default.info(`Added custom quick response: ${response.type}`);
    }
    /**
     * Remove quick response
     */
    removeQuickResponse(type) {
        const result = this.quickResponses.delete(type);
        if (result) {
            logger_1.default.info(`Removed quick response: ${type}`);
        }
        return result;
    }
}
exports.QuickResponseService = QuickResponseService;
exports.default = new QuickResponseService();
//# sourceMappingURL=quickResponse.service.js.map