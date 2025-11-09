"use strict";
/**
 * Media Routes
 * Task 132: POST /api/v1/media/upload endpoint for media uploads
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_http_middleware_1 = require("../middleware/auth.http.middleware");
const media_service_1 = __importDefault(require("../services/media.service"));
const voiceToText_service_1 = __importDefault(require("../services/voiceToText.service"));
const message_schema_1 = __importDefault(require("../db/schemas/message.schema"));
const kafka_service_1 = __importDefault(require("../services/kafka.service"));
const Message_1 = require("../models/Message");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
// Configure multer for memory storage
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max file size
    },
    fileFilter: (_req, file, cb) => {
        const validation = media_service_1.default.validateMedia(file.mimetype, file.size);
        if (validation.valid) {
            cb(null, true);
        }
        else {
            cb(new Error(validation.error || 'Invalid file'));
        }
    }
});
/**
 * POST /api/v1/media/upload
 * Upload media file (image, video, audio) and create message
 */
router.post('/upload', auth_http_middleware_1.authenticateHTTP, upload.single('file'), async (req, res) => {
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
        const userId = req.userId;
        logger_1.default.info(`Media upload initiated: ${file.originalname} (${file.size} bytes, ${file.mimetype}) ` +
            `by user ${userId} for emergency ${emergencyId}`);
        // Upload file
        const uploadResult = await media_service_1.default.uploadMedia(file.buffer, file.originalname, file.mimetype, emergencyId);
        logger_1.default.info(`Media uploaded successfully: ${uploadResult.url}`);
        // Determine message type
        const mediaCategory = media_service_1.default.getMediaCategory(file.mimetype);
        let messageType;
        switch (mediaCategory) {
            case 'image':
                messageType = Message_1.MessageType.IMAGE;
                break;
            case 'video':
                messageType = Message_1.MessageType.VIDEO;
                break;
            case 'audio':
                messageType = Message_1.MessageType.VOICE;
                break;
            default:
                messageType = Message_1.MessageType.TEXT;
        }
        // Build message metadata
        const metadata = {
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
                const transcriptionResult = await voiceToText_service_1.default.transcribeAudio(file.buffer);
                metadata.transcription = transcriptionResult.transcription;
                metadata.transcriptionConfidence = transcriptionResult.confidence;
                metadata.mediaDuration = transcriptionResult.duration;
                logger_1.default.info(`Audio transcribed: "${transcriptionResult.transcription}" ` +
                    `(confidence: ${transcriptionResult.confidence})`);
            }
            catch (error) {
                logger_1.default.error('Audio transcription failed:', error);
                // Continue without transcription
            }
        }
        // Create message document
        const messageDoc = new message_schema_1.default({
            emergencyId,
            senderId: userId,
            senderRole: req.userRole || Message_1.SenderRole.USER,
            type: messageType,
            content: content || `Shared ${mediaCategory}`,
            metadata,
            status: 'SENT',
            deliveredTo: [],
            readBy: []
        });
        const savedMessage = await messageDoc.save();
        const message = savedMessage.toJSON();
        logger_1.default.info(`Message created for media upload: ${message.id}`);
        // Publish to Kafka
        await kafka_service_1.default.publishMessageSentEvent({
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
    }
    catch (error) {
        logger_1.default.error('Error uploading media:', error);
        let errorMessage = 'Failed to upload media';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return res.status(500).json({
            success: false,
            error: errorMessage
        });
    }
});
/**
 * POST /api/v1/media/transcribe
 * Transcribe audio file to text (standalone endpoint)
 */
router.post('/transcribe', auth_http_middleware_1.authenticateHTTP, upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No audio file provided'
            });
        }
        const file = req.file;
        // Validate audio format
        if (!voiceToText_service_1.default.validateAudioFormat(file.mimetype)) {
            return res.status(400).json({
                success: false,
                error: 'Unsupported audio format'
            });
        }
        logger_1.default.info(`Transcription requested for audio: ${file.originalname} (${file.size} bytes)`);
        // Transcribe audio
        const transcriptionResult = await voiceToText_service_1.default.transcribeAudio(file.buffer, {
            languageCode: req.body.languageCode || 'en-US'
        });
        logger_1.default.info(`Audio transcribed successfully: "${transcriptionResult.transcription}"`);
        return res.status(200).json({
            success: true,
            transcription: transcriptionResult
        });
    }
    catch (error) {
        logger_1.default.error('Error transcribing audio:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to transcribe audio'
        });
    }
});
/**
 * GET /api/v1/media/signed-url/:key
 * Generate signed URL for secure media access
 */
router.get('/signed-url/:key', auth_http_middleware_1.authenticateHTTP, async (req, res) => {
    try {
        const { key } = req.params;
        const expiresIn = parseInt(req.query.expiresIn) || 3600;
        logger_1.default.info(`Generating signed URL for key: ${key} (expires in ${expiresIn}s)`);
        const signedUrlResult = await media_service_1.default.generateSignedUrl(key, expiresIn);
        return res.status(200).json({
            success: true,
            ...signedUrlResult
        });
    }
    catch (error) {
        logger_1.default.error('Error generating signed URL:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to generate signed URL'
        });
    }
});
/**
 * GET /api/v1/media/languages
 * Get supported languages for voice transcription
 */
router.get('/languages', (_req, res) => {
    const languages = voiceToText_service_1.default.getSupportedLanguages();
    return res.status(200).json({
        success: true,
        languages
    });
});
exports.default = router;
//# sourceMappingURL=media.routes.js.map