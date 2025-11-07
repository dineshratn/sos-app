/**
 * Quick Response Service
 * Task 130: Predefined quick responses for emergency situations
 */

import { QuickResponseType, MessageMetadata } from '../models/Message';
import logger from '../utils/logger';

export interface QuickResponse {
  type: QuickResponseType;
  displayText: string;
  messageContent: string;
  icon?: string;
  priority?: 'high' | 'medium' | 'low';
  metadata?: Partial<MessageMetadata>;
}

export class QuickResponseService {
  private quickResponses: Map<QuickResponseType, QuickResponse>;

  constructor() {
    this.quickResponses = new Map();
    this.initializeQuickResponses();
  }

  /**
   * Initialize predefined quick responses
   */
  private initializeQuickResponses(): void {
    const responses: QuickResponse[] = [
      {
        type: QuickResponseType.NEED_AMBULANCE,
        displayText: 'Need Ambulance',
        messageContent: 'I need an ambulance urgently!',
        icon: '🚑',
        priority: 'high'
      },
      {
        type: QuickResponseType.NEED_POLICE,
        displayText: 'Need Police',
        messageContent: 'I need police assistance!',
        icon: '🚔',
        priority: 'high'
      },
      {
        type: QuickResponseType.NEED_FIRE,
        displayText: 'Need Fire Department',
        messageContent: 'I need the fire department!',
        icon: '🚒',
        priority: 'high'
      },
      {
        type: QuickResponseType.TRAPPED,
        displayText: 'I am Trapped',
        messageContent: 'I am trapped and cannot move!',
        icon: '🆘',
        priority: 'high'
      },
      {
        type: QuickResponseType.FIRE,
        displayText: 'Fire Emergency',
        messageContent: 'There is a fire!',
        icon: '🔥',
        priority: 'high'
      },
      {
        type: QuickResponseType.SAFE_NOW,
        displayText: 'I am Safe Now',
        messageContent: 'I am safe now, situation under control.',
        icon: '✅',
        priority: 'medium'
      },
      {
        type: QuickResponseType.NEED_HELP,
        displayText: 'Need Help',
        messageContent: 'I need help!',
        icon: '🆘',
        priority: 'high'
      },
      {
        type: QuickResponseType.SEND_LOCATION,
        displayText: 'Send Location',
        messageContent: 'Here is my location',
        icon: '📍',
        priority: 'high'
      }
    ];

    responses.forEach((response) => {
      this.quickResponses.set(response.type, response);
    });

    logger.info(`Initialized ${this.quickResponses.size} quick response templates`);
  }

  /**
   * Get a quick response by type
   */
  getQuickResponse(type: QuickResponseType): QuickResponse | undefined {
    return this.quickResponses.get(type);
  }

  /**
   * Get all available quick responses
   */
  getAllQuickResponses(): QuickResponse[] {
    return Array.from(this.quickResponses.values());
  }

  /**
   * Get high priority quick responses
   */
  getHighPriorityResponses(): QuickResponse[] {
    return Array.from(this.quickResponses.values()).filter(
      (response) => response.priority === 'high'
    );
  }

  /**
   * Generate message content from quick response type
   */
  generateMessageContent(
    type: QuickResponseType,
    customData?: Record<string, any>
  ): { content: string; metadata: MessageMetadata } {
    const quickResponse = this.quickResponses.get(type);

    if (!quickResponse) {
      logger.warn(`Quick response type not found: ${type}`);
      return {
        content: 'Quick response',
        metadata: { quickResponseType: type }
      };
    }

    // Build metadata
    const metadata: MessageMetadata = {
      quickResponseType: type,
      ...quickResponse.metadata,
      ...customData
    };

    logger.info(`Generated quick response message for type: ${type}`);

    return {
      content: quickResponse.messageContent,
      metadata
    };
  }

  /**
   * Validate quick response type
   */
  isValidQuickResponseType(type: string): type is QuickResponseType {
    return Object.values(QuickResponseType).includes(type as QuickResponseType);
  }

  /**
   * Add custom quick response (for extensibility)
   */
  addCustomQuickResponse(response: QuickResponse): void {
    this.quickResponses.set(response.type, response);
    logger.info(`Added custom quick response: ${response.type}`);
  }

  /**
   * Remove quick response
   */
  removeQuickResponse(type: QuickResponseType): boolean {
    const result = this.quickResponses.delete(type);
    if (result) {
      logger.info(`Removed quick response: ${type}`);
    }
    return result;
  }
}

export default new QuickResponseService();
