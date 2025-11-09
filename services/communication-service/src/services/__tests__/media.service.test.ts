/**
 * Media Service Tests
 * Task 136: Comprehensive unit tests for media service
 */

import { MediaService } from '../media.service';
import * as fs from 'fs/promises';

jest.mock('fs/promises');
jest.mock('../../utils/logger');

describe('MediaService', () => {
  let mediaService: MediaService;

  beforeEach(() => {
    jest.clearAllMocks();
    mediaService = new MediaService();
  });

  describe('validateMedia', () => {
    it('should validate supported image types', () => {
      const result = mediaService.validateMedia('image/jpeg', 1024 * 1024);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate supported video types', () => {
      const result = mediaService.validateMedia('video/mp4', 10 * 1024 * 1024);

      expect(result.valid).toBe(true);
    });

    it('should validate supported audio types', () => {
      const result = mediaService.validateMedia('audio/mpeg', 5 * 1024 * 1024);

      expect(result.valid).toBe(true);
    });

    it('should reject files exceeding size limit', () => {
      const result = mediaService.validateMedia('image/jpeg', 100 * 1024 * 1024); // 100MB

      expect(result.valid).toBe(false);
      expect(result.error).toContain('size exceeds');
    });

    it('should reject unsupported file types', () => {
      const result = mediaService.validateMedia('application/pdf', 1024 * 1024);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should accept files at size limit', () => {
      const result = mediaService.validateMedia('image/jpeg', 50 * 1024 * 1024); // Exactly 50MB

      expect(result.valid).toBe(true);
    });
  });

  describe('getMediaCategory', () => {
    it('should categorize image types', () => {
      expect(mediaService.getMediaCategory('image/jpeg')).toBe('image');
      expect(mediaService.getMediaCategory('image/png')).toBe('image');
      expect(mediaService.getMediaCategory('image/gif')).toBe('image');
    });

    it('should categorize video types', () => {
      expect(mediaService.getMediaCategory('video/mp4')).toBe('video');
      expect(mediaService.getMediaCategory('video/webm')).toBe('video');
    });

    it('should categorize audio types', () => {
      expect(mediaService.getMediaCategory('audio/mpeg')).toBe('audio');
      expect(mediaService.getMediaCategory('audio/wav')).toBe('audio');
    });

    it('should return unknown for unsupported types', () => {
      expect(mediaService.getMediaCategory('application/pdf')).toBe('unknown');
      expect(mediaService.getMediaCategory('text/plain')).toBe('unknown');
    });
  });

  describe('uploadMedia', () => {
    it('should upload media to local storage in development', async () => {
      const buffer = Buffer.from('test-image-data');
      const originalName = 'test-image.jpg';
      const mimeType = 'image/jpeg';
      const emergencyId = 'emergency-123';

      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await mediaService.uploadMedia(
        buffer,
        originalName,
        mimeType,
        emergencyId
      );

      expect(result).toBeDefined();
      expect(result.url).toContain('http://localhost:3003/media/');
      expect(result.key).toContain(emergencyId);
      expect(result.key).toContain('.jpg');
      expect(result.size).toBe(buffer.length);
      expect(result.mimeType).toBe(mimeType);
    });

    it('should generate thumbnail URL for images', async () => {
      const buffer = Buffer.from('test-image-data');
      const originalName = 'test-image.jpg';
      const mimeType = 'image/jpeg';
      const emergencyId = 'emergency-123';

      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await mediaService.uploadMedia(
        buffer,
        originalName,
        mimeType,
        emergencyId
      );

      expect(result.thumbnailUrl).toBeDefined();
      expect(result.thumbnailUrl).toContain('thumbnail=true');
    });

    it('should not generate thumbnail for videos', async () => {
      const buffer = Buffer.from('test-video-data');
      const originalName = 'test-video.mp4';
      const mimeType = 'video/mp4';
      const emergencyId = 'emergency-123';

      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await mediaService.uploadMedia(
        buffer,
        originalName,
        mimeType,
        emergencyId
      );

      expect(result.thumbnailUrl).toBeUndefined();
    });

    it('should handle upload errors', async () => {
      const buffer = Buffer.from('test-data');

      (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Disk full'));

      await expect(
        mediaService.uploadMedia(buffer, 'test.jpg', 'image/jpeg', 'emergency-123')
      ).rejects.toThrow('Failed to upload media');
    });
  });

  describe('generateSignedUrl', () => {
    it('should generate signed URL for local storage', async () => {
      const key = 'emergency-123_abc123.jpg';

      const result = await mediaService.generateSignedUrl(key);

      expect(result).toBeDefined();
      expect(result.signedUrl).toContain(key);
      expect(result.expiresIn).toBe(3600);
    });

    it('should use custom expiry time', async () => {
      const key = 'emergency-123_abc123.jpg';
      const expiresIn = 7200;

      const result = await mediaService.generateSignedUrl(key, expiresIn);

      expect(result.expiresIn).toBe(expiresIn);
    });
  });

  describe('deleteMedia', () => {
    it('should delete media from local storage', async () => {
      const key = 'emergency-123_abc123.jpg';

      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      await expect(mediaService.deleteMedia(key)).resolves.not.toThrow();

      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      const key = 'emergency-123_abc123.jpg';

      (fs.unlink as jest.Mock).mockRejectedValue(new Error('File not found'));

      await expect(mediaService.deleteMedia(key)).rejects.toThrow('Failed to delete media');
    });
  });
});
