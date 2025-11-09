/**
 * Media Routes
 * Task 132: POST /api/v1/media/upload endpoint for media uploads
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticateHTTP, AuthenticatedRequest } from '../middleware/auth.http.middleware';
import mediaService from '../services/media.service';
import voiceToTextService from '../services/voiceToText.service';
import MessageModel from '../db/schemas/message.schema';
import kafkaService from '../services/kafka.service';
import { MessageType, SenderRole } from '../models/Message';
import logger from '../utils/logger';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  },
  fileFilter: (_req, file, cb) => {
    const validation = mediaService.validateMedia(file.mimetype, file.size);
    if (validation.valid) {
      cb(null, true);
    } else {
      cb(new Error(validation.error || 'Invalid file'));
    }
  }
});

/**
 * POST /api/v1/media/upload
 * Upload media file (image, video, audio) and create message
 */
router.post(
  '/upload',
  authenticateHTTP,
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided'
        });
      }

      const { emergencyId, content } = req.body;

      if (!emergencyId) {
        return res.status(400).json({
          success: false,
          error: 'Emergency ID is required'
        });
      }

      const file = req.file;
      const userId = req.userId!;

      logger.info(
        `Media upload initiated: ${file.originalname} (${file.size} bytes, ${file.mimetype}) ` +
        `by user ${userId} for emergency ${emergencyId}`
      );

      // Upload file
      const uploadResult = await mediaService.uploadMedia(
        file.buffer,
        file.originalname,
        file.mimetype,
        emergencyId
      );

      logger.info(`Media uploaded successfully: ${uploadResult.url}`);

      // Determine message type
      const mediaCategory = mediaService.getMediaCategory(file.mimetype);
      let messageType: MessageType;

      switch (mediaCategory) {
        case 'image':
          messageType = MessageType.IMAGE;
          break;
        case 'video':
          messageType = MessageType.VIDEO;
          break;
        case 'audio':
          messageType = MessageType.VOICE;
          break;
        default:
          messageType = MessageType.TEXT;
      }

      // Build message metadata
      const metadata: any = {
        mediaUrl: uploadResult.url,
        mediaType: file.mimetype,
        mediaSize: uploadResult.size,
        fileName: uploadResult.key,
        originalName: file.originalname
      };

      if (uploadResult.thumbnailUrl) {
        metadata.thumbnailUrl = uploadResult.thumbnailUrl;
      }

      // For audio files, attempt transcription
      if (mediaCategory === 'audio') {
        try {
          const transcriptionResult = await voiceToTextService.transcribeAudio(file.buffer);
          metadata.transcription = transcriptionResult.transcription;
          metadata.transcriptionConfidence = transcriptionResult.confidence;
          metadata.mediaDuration = transcriptionResult.duration;

          logger.info(
            `Audio transcribed: "${transcriptionResult.transcription}" ` +
            `(confidence: ${transcriptionResult.confidence})`
          );
        } catch (error) {
          logger.error('Audio transcription failed:', error);
          // Continue without transcription
        }
      }

      // Create message document
      const messageDoc = new MessageModel({
        emergencyId,
        senderId: userId,
        senderRole: req.userRole || SenderRole.USER,
        type: messageType,
        content: content || `Shared ${mediaCategory}`,
        metadata,
        status: 'SENT',
        deliveredTo: [],
        readBy: []
      });

      const savedMessage = await messageDoc.save();
      const message = savedMessage.toJSON();

      logger.info(`Message created for media upload: ${message.id}`);

      // Publish to Kafka
      await kafkaService.publishMessageSentEvent({
        emergencyId,
        messageId: message.id,
        senderId: userId,
        messageType
      });

      // Return success response
      return res.status(200).json({
        success: true,
        message,
        uploadResult
      });
    } catch (error) {
      logger.error('Error uploading media:', error);

      let errorMessage = 'Failed to upload media';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return res.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  }
);

/**
 * POST /api/v1/media/transcribe
 * Transcribe audio file to text (standalone endpoint)
 */
router.post(
  '/transcribe',
  authenticateHTTP,
  upload.single('audio'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No audio file provided'
        });
      }

      const file = req.file;

      // Validate audio format
      if (!voiceToTextService.validateAudioFormat(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: 'Unsupported audio format'
        });
      }

      logger.info(`Transcription requested for audio: ${file.originalname} (${file.size} bytes)`);

      // Transcribe audio
      const transcriptionResult = await voiceToTextService.transcribeAudio(file.buffer, {
        languageCode: req.body.languageCode || 'en-US'
      });

      logger.info(`Audio transcribed successfully: "${transcriptionResult.transcription}"`);

      return res.status(200).json({
        success: true,
        transcription: transcriptionResult
      });
    } catch (error) {
      logger.error('Error transcribing audio:', error);

      return res.status(500).json({
        success: false,
        error: 'Failed to transcribe audio'
      });
    }
  }
);

/**
 * GET /api/v1/media/signed-url/:key
 * Generate signed URL for secure media access
 */
router.get(
  '/signed-url/:key',
  authenticateHTTP,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { key } = req.params;
      const expiresIn = parseInt(req.query.expiresIn as string) || 3600;

      logger.info(`Generating signed URL for key: ${key} (expires in ${expiresIn}s)`);

      const signedUrlResult = await mediaService.generateSignedUrl(key, expiresIn);

      return res.status(200).json({
        success: true,
        ...signedUrlResult
      });
    } catch (error) {
      logger.error('Error generating signed URL:', error);

      return res.status(500).json({
        success: false,
        error: 'Failed to generate signed URL'
      });
    }
  }
);

/**
 * GET /api/v1/media/languages
 * Get supported languages for voice transcription
 */
router.get('/languages', (_req: Request, res: Response) => {
  const languages = voiceToTextService.getSupportedLanguages();

  return res.status(200).json({
    success: true,
    languages
  });
});

export default router;
