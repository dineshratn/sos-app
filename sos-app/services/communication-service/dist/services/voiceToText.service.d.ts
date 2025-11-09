/**
 * Voice-to-Text Service
 * Task 133: Accept audio blobs and transcribe to text
 * Mock implementation with placeholder for Google Cloud Speech-to-Text integration
 */
export interface VoiceToTextOptions {
    languageCode?: string;
    model?: string;
    enableAutomaticPunctuation?: boolean;
}
export interface TranscriptionResult {
    transcription: string;
    confidence: number;
    languageCode: string;
    duration?: number;
    words?: Array<{
        word: string;
        startTime: number;
        endTime: number;
        confidence: number;
    }>;
}
export declare class VoiceToTextService {
    private isProduction;
    constructor();
    /**
     * Transcribe audio to text
     * @param audioBuffer Audio file buffer
     * @param options Transcription options
     * @returns Transcription result
     */
    transcribeAudio(audioBuffer: Buffer, options?: VoiceToTextOptions): Promise<TranscriptionResult>;
    /**
     * Mock transcription for development and testing
     */
    private mockTranscription;
    /**
     * Generate mock word-level transcription
     */
    private generateMockWords;
    /**
     * Transcribe with Google Cloud Speech-to-Text API
     * TODO: Implement production integration
     */
    private transcribeWithGoogleCloud;
    /**
     * Validate audio format
     */
    validateAudioFormat(mimeType: string): boolean;
    /**
     * Get supported languages
     */
    getSupportedLanguages(): string[];
    /**
     * Estimate transcription cost (for production monitoring)
     */
    estimateTranscriptionCost(audioBuffer: Buffer): number;
}
declare const _default: VoiceToTextService;
export default _default;
//# sourceMappingURL=voiceToText.service.d.ts.map