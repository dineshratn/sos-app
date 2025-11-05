/**
 * Quick Response Service Tests
 * Task 136: Comprehensive unit tests for quick response service
 */

import { QuickResponseService } from '../quickResponse.service';
import { QuickResponseType } from '../../models/Message';

jest.mock('../../utils/logger');

describe('QuickResponseService', () => {
  let quickResponseService: QuickResponseService;

  beforeEach(() => {
    quickResponseService = new QuickResponseService();
  });

  describe('getQuickResponse', () => {
    it('should return quick response for valid type', () => {
      const response = quickResponseService.getQuickResponse(QuickResponseType.NEED_AMBULANCE);

      expect(response).toBeDefined();
      expect(response?.type).toBe(QuickResponseType.NEED_AMBULANCE);
      expect(response?.displayText).toBe('Need Ambulance');
      expect(response?.messageContent).toContain('ambulance');
      expect(response?.priority).toBe('high');
    });

    it('should return undefined for invalid type', () => {
      const response = quickResponseService.getQuickResponse('INVALID_TYPE' as any);

      expect(response).toBeUndefined();
    });
  });

  describe('getAllQuickResponses', () => {
    it('should return all quick responses', () => {
      const responses = quickResponseService.getAllQuickResponses();

      expect(responses).toBeInstanceOf(Array);
      expect(responses.length).toBeGreaterThan(0);
      expect(responses).toContainEqual(
        expect.objectContaining({
          type: QuickResponseType.NEED_AMBULANCE
        })
      );
    });
  });

  describe('getHighPriorityResponses', () => {
    it('should return only high priority responses', () => {
      const responses = quickResponseService.getHighPriorityResponses();

      expect(responses).toBeInstanceOf(Array);
      responses.forEach((response) => {
        expect(response.priority).toBe('high');
      });
    });

    it('should include NEED_AMBULANCE in high priority', () => {
      const responses = quickResponseService.getHighPriorityResponses();

      const ambulanceResponse = responses.find(
        (r) => r.type === QuickResponseType.NEED_AMBULANCE
      );

      expect(ambulanceResponse).toBeDefined();
    });
  });

  describe('generateMessageContent', () => {
    it('should generate message content for quick response', () => {
      const result = quickResponseService.generateMessageContent(
        QuickResponseType.TRAPPED
      );

      expect(result).toBeDefined();
      expect(result.content).toContain('trapped');
      expect(result.metadata.quickResponseType).toBe(QuickResponseType.TRAPPED);
    });

    it('should include custom data in metadata', () => {
      const customData = {
        location: 'Building A, Floor 2',
        additionalInfo: 'Near elevator'
      };

      const result = quickResponseService.generateMessageContent(
        QuickResponseType.NEED_HELP,
        customData
      );

      expect(result.metadata).toMatchObject(customData);
      expect(result.metadata.quickResponseType).toBe(QuickResponseType.NEED_HELP);
    });

    it('should handle invalid quick response type', () => {
      const result = quickResponseService.generateMessageContent('INVALID' as any);

      expect(result).toBeDefined();
      expect(result.content).toBe('Quick response');
      expect(result.metadata.quickResponseType).toBe('INVALID');
    });
  });

  describe('isValidQuickResponseType', () => {
    it('should return true for valid quick response types', () => {
      expect(quickResponseService.isValidQuickResponseType('NEED_AMBULANCE')).toBe(true);
      expect(quickResponseService.isValidQuickResponseType('TRAPPED')).toBe(true);
      expect(quickResponseService.isValidQuickResponseType('SAFE_NOW')).toBe(true);
    });

    it('should return false for invalid types', () => {
      expect(quickResponseService.isValidQuickResponseType('INVALID_TYPE')).toBe(false);
      expect(quickResponseService.isValidQuickResponseType('')).toBe(false);
    });
  });

  describe('addCustomQuickResponse', () => {
    it('should add custom quick response', () => {
      const customResponse = {
        type: 'CUSTOM_RESPONSE' as QuickResponseType,
        displayText: 'Custom Response',
        messageContent: 'This is a custom response',
        priority: 'medium' as const
      };

      quickResponseService.addCustomQuickResponse(customResponse);

      const response = quickResponseService.getQuickResponse('CUSTOM_RESPONSE' as any);
      expect(response).toBeDefined();
      expect(response?.displayText).toBe('Custom Response');
    });
  });

  describe('removeQuickResponse', () => {
    it('should remove quick response', () => {
      const result = quickResponseService.removeQuickResponse(QuickResponseType.SAFE_NOW);

      expect(result).toBe(true);

      const response = quickResponseService.getQuickResponse(QuickResponseType.SAFE_NOW);
      expect(response).toBeUndefined();
    });

    it('should return false for non-existent type', () => {
      const result = quickResponseService.removeQuickResponse('NON_EXISTENT' as any);

      expect(result).toBe(false);
    });
  });
});
