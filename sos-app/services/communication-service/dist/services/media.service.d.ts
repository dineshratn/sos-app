/**
 * Media Service
 * Handles media uploads with S3 integration (mock for now)
 */
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
export declare class MediaService {
    private isProduction;
    private localStoragePath;
    constructor();
    /**
     * Initialize local storage directory for development
     */
    private initializeLocalStorage;
    /**
     * Upload media file
     */
    uploadMedia(buffer: Buffer, originalName: string, mimeType: string, emergencyId: string): Promise<UploadResult>;
    /**
     * Upload to local storage (development)
     */
    private uploadToLocal;
    /**
     * Upload to AWS S3 (production)
     * TODO: Implement S3 upload
     */
    private uploadToS3;
    /**
     * Generate signed URL for secure media access
     */
    generateSignedUrl(key: string, expiresIn?: number): Promise<SignedUrlResult>;
    /**
     * Generate S3 signed URL
     * TODO: Implement S3 signed URL generation
     */
    private generateS3SignedUrl;
    /**
     * Delete media file
     */
    deleteMedia(key: string): Promise<void>;
    /**
     * Delete from local storage
     */
    private deleteFromLocal;
    /**
     * Delete from S3
     * TODO: Implement S3 deletion
     */
    private deleteFromS3;
    /**
     * Validate media file
     */
    validateMedia(mimeType: string, size: number): {
        valid: boolean;
        error?: string;
    };
    /**
     * Get media type category
     */
    getMediaCategory(mimeType: string): 'image' | 'video' | 'audio' | 'unknown';
}
declare const _default: MediaService;
export default _default;
//# sourceMappingURL=media.service.d.ts.map