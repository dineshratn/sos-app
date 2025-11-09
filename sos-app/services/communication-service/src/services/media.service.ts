/**
 * Media Service
 * Handles media uploads with S3 integration (mock for now)
 */

import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';
import logger from '../utils/logger';

export interface UploadResult {
  url: string;
  key: string;
  bucket?: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
}

export interface SignedUrlResult {
  signedUrl: string;
  expiresIn: number;
}

export class MediaService {
  private isProduction: boolean;
  private localStoragePath: string;
  private s3Bucket: string;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.localStoragePath = process.env.MEDIA_STORAGE_PATH || '/tmp/sos-media';
    this.s3Bucket = process.env.AWS_S3_BUCKET || 'sos-app-media';
    this.initializeLocalStorage();
  }

  /**
   * Initialize local storage directory for development
   */
  private async initializeLocalStorage(): Promise<void> {
    try {
      await fs.mkdir(this.localStoragePath, { recursive: true });
      logger.info(`Local media storage initialized at: ${this.localStoragePath}`);
    } catch (error) {
      logger.error('Error initializing local storage:', error);
    }
  }

  /**
   * Upload media file
   */
  async uploadMedia(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    emergencyId: string
  ): Promise<UploadResult> {
    try {
      logger.info(`Uploading media: ${originalName} (${buffer.length} bytes) for emergency ${emergencyId}`);

      if (this.isProduction) {
        return await this.uploadToS3(buffer, originalName, mimeType, emergencyId);
      } else {
        return await this.uploadToLocal(buffer, originalName, mimeType, emergencyId);
      }
    } catch (error) {
      logger.error('Error uploading media:', error);
      throw new Error('Failed to upload media');
    }
  }

  /**
   * Upload to local storage (development)
   */
  private async uploadToLocal(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    emergencyId: string
  ): Promise<UploadResult> {
    const fileExt = path.extname(originalName);
    const fileName = `${emergencyId}_${uuidv4()}${fileExt}`;
    const filePath = path.join(this.localStoragePath, fileName);

    await fs.writeFile(filePath, buffer);

    logger.info(`Media saved locally: ${filePath}`);

    // Generate mock URL (in production, this would be a CDN URL)
    const url = `http://localhost:3003/media/${fileName}`;

    const result: UploadResult = {
      url,
      key: fileName,
      size: buffer.length,
      mimeType
    };

    // Generate thumbnail for images
    if (mimeType.startsWith('image/')) {
      result.thumbnailUrl = `${url}?thumbnail=true`;
    }

    return result;
  }

  /**
   * Upload to AWS S3 (production)
   * TODO: Implement S3 upload
   */
  private async uploadToS3(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    emergencyId: string
  ): Promise<UploadResult> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _s3Bucket = this.s3Bucket;
    logger.warn('AWS S3 upload not implemented yet, falling back to local storage');

    // TODO: Implement AWS S3 upload
    /*
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    const fileExt = path.extname(originalName);
    const key = `emergency/${emergencyId}/${uuidv4()}${fileExt}`;

    const params = {
      Bucket: this.s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: 'private', // Use private and generate signed URLs
    };

    const uploadResult = await s3.upload(params).promise();

    logger.info(`Media uploaded to S3: ${uploadResult.Key}`);

    return {
      url: uploadResult.Location,
      key: uploadResult.Key,
      bucket: this.s3Bucket,
      size: buffer.length,
      mimeType
    };
    */

    return await this.uploadToLocal(buffer, originalName, mimeType, emergencyId);
  }

  /**
   * Generate signed URL for secure media access
   */
  async generateSignedUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<SignedUrlResult> {
    try {
      if (this.isProduction) {
        return await this.generateS3SignedUrl(key, expiresIn);
      } else {
        // For local development, return direct URL
        return {
          signedUrl: `http://localhost:3003/media/${key}`,
          expiresIn
        };
      }
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  /**
   * Generate S3 signed URL
   * TODO: Implement S3 signed URL generation
   */
  private async generateS3SignedUrl(
    key: string,
    expiresIn: number
  ): Promise<SignedUrlResult> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _s3Bucket = this.s3Bucket;
    logger.warn('AWS S3 signed URL generation not implemented yet');

    // TODO: Implement S3 signed URL
    /*
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    const signedUrl = await s3.getSignedUrlPromise('getObject', {
      Bucket: this.s3Bucket,
      Key: key,
      Expires: expiresIn
    });

    return {
      signedUrl,
      expiresIn
    };
    */

    return {
      signedUrl: `http://localhost:3003/media/${key}`,
      expiresIn
    };
  }

  /**
   * Delete media file
   */
  async deleteMedia(key: string): Promise<void> {
    try {
      if (this.isProduction) {
        await this.deleteFromS3(key);
      } else {
        await this.deleteFromLocal(key);
      }

      logger.info(`Media deleted: ${key}`);
    } catch (error) {
      logger.error('Error deleting media:', error);
      throw new Error('Failed to delete media');
    }
  }

  /**
   * Delete from local storage
   */
  private async deleteFromLocal(key: string): Promise<void> {
    const filePath = path.join(this.localStoragePath, key);
    await fs.unlink(filePath);
  }

  /**
   * Delete from S3
   * TODO: Implement S3 deletion
   */
  private async deleteFromS3(_key: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _s3Bucket = this.s3Bucket;
    logger.warn('AWS S3 delete not implemented yet');

    // TODO: Implement S3 deletion
    /*
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    await s3.deleteObject({
      Bucket: this.s3Bucket,
      Key: key
    }).promise();
    */
  }

  /**
   * Validate media file
   */
  validateMedia(mimeType: string, size: number): { valid: boolean; error?: string } {
    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (size > maxSize) {
      return { valid: false, error: 'File size exceeds 50MB limit' };
    }

    // Check mime type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/webm',
      'audio/ogg',
      'audio/x-m4a'
    ];

    if (!allowedTypes.includes(mimeType)) {
      return { valid: false, error: `File type ${mimeType} not allowed` };
    }

    return { valid: true };
  }

  /**
   * Get media type category
   */
  getMediaCategory(mimeType: string): 'image' | 'video' | 'audio' | 'unknown' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'unknown';
  }
}

export default new MediaService();
