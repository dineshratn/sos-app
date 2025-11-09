"use strict";
/**
 * Media Service
 * Handles media uploads with S3 integration (mock for now)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const uuid_1 = require("uuid");
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const logger_1 = __importDefault(require("../utils/logger"));
class MediaService {
    constructor() {
        this.isProduction = process.env.NODE_ENV === 'production';
        this.localStoragePath = process.env.MEDIA_STORAGE_PATH || '/tmp/sos-media';
        // S3 bucket configuration will be added when S3 integration is implemented
        // const s3Bucket = process.env.AWS_S3_BUCKET || 'sos-app-media';
        this.initializeLocalStorage();
    }
    /**
     * Initialize local storage directory for development
     */
    async initializeLocalStorage() {
        try {
            await fs.mkdir(this.localStoragePath, { recursive: true });
            logger_1.default.info(`Local media storage initialized at: ${this.localStoragePath}`);
        }
        catch (error) {
            logger_1.default.error('Error initializing local storage:', error);
        }
    }
    /**
     * Upload media file
     */
    async uploadMedia(buffer, originalName, mimeType, emergencyId) {
        try {
            logger_1.default.info(`Uploading media: ${originalName} (${buffer.length} bytes) for emergency ${emergencyId}`);
            if (this.isProduction) {
                return await this.uploadToS3(buffer, originalName, mimeType, emergencyId);
            }
            else {
                return await this.uploadToLocal(buffer, originalName, mimeType, emergencyId);
            }
        }
        catch (error) {
            logger_1.default.error('Error uploading media:', error);
            throw new Error('Failed to upload media');
        }
    }
    /**
     * Upload to local storage (development)
     */
    async uploadToLocal(buffer, originalName, mimeType, emergencyId) {
        const fileExt = path.extname(originalName);
        const fileName = `${emergencyId}_${(0, uuid_1.v4)()}${fileExt}`;
        const filePath = path.join(this.localStoragePath, fileName);
        await fs.writeFile(filePath, buffer);
        logger_1.default.info(`Media saved locally: ${filePath}`);
        // Generate mock URL (in production, this would be a CDN URL)
        const url = `http://localhost:3003/media/${fileName}`;
        const result = {
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
    async uploadToS3(buffer, originalName, mimeType, emergencyId) {
        logger_1.default.warn('AWS S3 upload not implemented yet, falling back to local storage');
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
    async generateSignedUrl(key, expiresIn = 3600) {
        try {
            if (this.isProduction) {
                return await this.generateS3SignedUrl(key, expiresIn);
            }
            else {
                // For local development, return direct URL
                return {
                    signedUrl: `http://localhost:3003/media/${key}`,
                    expiresIn
                };
            }
        }
        catch (error) {
            logger_1.default.error('Error generating signed URL:', error);
            throw new Error('Failed to generate signed URL');
        }
    }
    /**
     * Generate S3 signed URL
     * TODO: Implement S3 signed URL generation
     */
    async generateS3SignedUrl(key, expiresIn) {
        logger_1.default.warn('AWS S3 signed URL generation not implemented yet');
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
    async deleteMedia(key) {
        try {
            if (this.isProduction) {
                await this.deleteFromS3(key);
            }
            else {
                await this.deleteFromLocal(key);
            }
            logger_1.default.info(`Media deleted: ${key}`);
        }
        catch (error) {
            logger_1.default.error('Error deleting media:', error);
            throw new Error('Failed to delete media');
        }
    }
    /**
     * Delete from local storage
     */
    async deleteFromLocal(key) {
        const filePath = path.join(this.localStoragePath, key);
        await fs.unlink(filePath);
    }
    /**
     * Delete from S3
     * TODO: Implement S3 deletion
     */
    async deleteFromS3(_key) {
        logger_1.default.warn('AWS S3 delete not implemented yet');
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
    validateMedia(mimeType, size) {
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
    getMediaCategory(mimeType) {
        if (mimeType.startsWith('image/'))
            return 'image';
        if (mimeType.startsWith('video/'))
            return 'video';
        if (mimeType.startsWith('audio/'))
            return 'audio';
        return 'unknown';
    }
}
exports.MediaService = MediaService;
exports.default = new MediaService();
//# sourceMappingURL=media.service.js.map