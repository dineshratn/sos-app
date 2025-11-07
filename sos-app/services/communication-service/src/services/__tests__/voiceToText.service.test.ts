/**
 * Voice-to-Text Service Tests
 * Task 136: Comprehensive unit tests for voice-to-text service
 */

import { VoiceToTextService } from '../voiceToText.service';

jest.mock('../../utils/logger');

describe('VoiceToTextService', () => {
  let voiceToTextService: VoiceToTextService;

  beforeEach(() => {
    voiceToTextService = new VoiceToTextService();
  });

  describe('transcribeAudio', () => {
    it('should transcribe audio buffer (mock)', async () => {
      const audioBuffer = Buffer.from('fake-audio-data');

      const result = await voiceToTextService.transcribeAudio(audioBuffer);

      expect(result).toBeDefined();
      expect(result.transcription).toBeDefined();
      expect(typeof result.transcription).toBe('string');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
      expect(result.languageCode).toBe('en-US');
    });

    it('should use custom language code', async () => {
      const audioBuffer = Buffer.from('fake-audio-data');
      const options = { languageCode: 'es-ES' };

      const result = await voiceToTextService.transcribeAudio(audioBuffer, options);

      expect(result.languageCode).toBe('es-ES');
    });

    it('should include word-level transcription', async () => {
      const audioBuffer = Buffer.from('fake-audio-data');

      const result = await voiceToTextService.transcribeAudio(audioBuffer);

      expect(result.words).toBeDefined();
      expect(result.words).toBeInstanceOf(Array);

      if (result.words && result.words.length > 0) {
        const firstWord = result.words[0];
        expect(firstWord).toHaveProperty('word');
        expect(firstWord).toHaveProperty('startTime');
        expect(firstWord).toHaveProperty('endTime');
        expect(firstWord).toHaveProperty('confidence');
      }
    });

    it('should calculate audio duration', async () => {
      const audioBuffer = Buffer.from('fake-audio-data');

      const result = await voiceToTextService.transcribeAudio(audioBuffer);

      expect(result.duration).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('validateAudioFormat', () => {
    it('should validate supported audio formats', () => {
      expect(voiceToTextService.validateAudioFormat('audio/wav')).toBe(true);
      expect(voiceToTextService.validateAudioFormat('audio/mpeg')).toBe(true);
      expect(voiceToTextService.validateAudioFormat('audio/mp3')).toBe(true);
      expect(voiceToTextService.validateAudioFormat('audio/webm')).toBe(true);
      expect(voiceToTextService.validateAudioFormat('audio/ogg')).toBe(true);
    });

    it('should reject unsupported formats', () => {
      expect(voiceToTextService.validateAudioFormat('video/mp4')).toBe(false);
      expect(voiceToTextService.validateAudioFormat('image/jpeg')).toBe(false);
      expect(voiceToTextService.validateAudioFormat('text/plain')).toBe(false);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', () => {
      const languages = voiceToTextService.getSupportedLanguages();

      expect(languages).toBeInstanceOf(Array);
      expect(languages.length).toBeGreaterThan(0);
      expect(languages).toContain('en-US');
      expect(languages).toContain('es-ES');
      expect(languages).toContain('fr-FR');
    });

    it('should include common languages', () => {
      const languages = voiceToTextService.getSupportedLanguages();

      const commonLanguages = ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'];

      commonLanguages.forEach((lang) => {
        expect(languages).toContain(lang);
      });
    });
  });

  describe('estimateTranscriptionCost', () => {
    it('should estimate cost for audio buffer', () => {
      // Create buffer representing ~30 seconds of audio at 16kHz
      const audioBuffer = Buffer.alloc(16000 * 30 * 2); // 30 seconds, 16kHz, 16-bit

      const cost = voiceToTextService.estimateTranscriptionCost(audioBuffer);

      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });

    it('should return higher cost for longer audio', () => {
      const shortBuffer = Buffer.alloc(16000 * 10 * 2); // 10 seconds
      const longBuffer = Buffer.alloc(16000 * 60 * 2); // 60 seconds

      const shortCost = voiceToTextService.estimateTranscriptionCost(shortBuffer);
      const longCost = voiceToTextService.estimateTranscriptionCost(longBuffer);

      expect(longCost).toBeGreaterThan(shortCost);
    });

    it('should return cost with appropriate precision', () => {
      const audioBuffer = Buffer.alloc(16000 * 30 * 2);

      const cost = voiceToTextService.estimateTranscriptionCost(audioBuffer);

      // Cost should have at most 4 decimal places
      const decimalPlaces = (cost.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(4);
    });
  });
});
