import MedicalProfile, { BloodType } from '../models/MedicalProfile';
import MedicalAllergy, { AllergySeverity } from '../models/MedicalAllergy';
import MedicalMedication from '../models/MedicalMedication';
import MedicalCondition, { ConditionSeverity } from '../models/MedicalCondition';
import MedicalAccessAudit, { AccessRole, AccessReason } from '../models/MedicalAccessAudit';
export interface UpdateMedicalProfileDTO {
    bloodType?: BloodType;
    organDonor?: boolean;
    doNotResuscitate?: boolean;
    emergencyNotes?: string;
    primaryPhysician?: string;
    primaryPhysicianPhone?: string;
    insuranceProvider?: string;
    insurancePolicyNumber?: string;
}
export interface CreateAllergyDTO {
    allergen: string;
    severity: AllergySeverity;
    reaction?: string;
    diagnosedDate?: string;
    notes?: string;
}
export interface CreateMedicationDTO {
    medicationName: string;
    dosage?: string;
    frequency?: string;
    route?: string;
    prescribedBy?: string;
    startDate?: string;
    endDate?: string;
    notes?: string;
}
export interface CreateConditionDTO {
    conditionName: string;
    severity?: ConditionSeverity;
    diagnosedDate?: string;
    isChronic?: boolean;
    notes?: string;
}
declare class MedicalService {
    /**
     * Log access to medical data for HIPAA compliance
     */
    private logAccess;
    /**
     * Get or create medical profile for a user
     */
    getOrCreateProfile(userId: string, accessInfo: {
        accessedBy: string;
        role: AccessRole;
        reason: AccessReason;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<MedicalProfile>;
    /**
     * Update medical profile
     */
    updateProfile(userId: string, updates: UpdateMedicalProfileDTO, accessInfo: {
        accessedBy: string;
        role: AccessRole;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<MedicalProfile>;
    /**
     * Get medical profile for emergency access
     */
    getProfileForEmergency(userId: string, emergencyId: string, accessInfo: {
        accessedBy: string;
        role: AccessRole;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<any>;
    /**
     * Generate secure access link for first responders
     */
    generateSecureAccessLink(userId: string, emergencyId: string, requesterRole: AccessRole): Promise<{
        token: string;
        expiresAt: Date;
    }>;
    /**
     * Add allergy to medical profile
     */
    addAllergy(userId: string, allergyData: CreateAllergyDTO): Promise<MedicalAllergy>;
    /**
     * Add medication to medical profile
     */
    addMedication(userId: string, medicationData: CreateMedicationDTO): Promise<MedicalMedication>;
    /**
     * Add medical condition to profile
     */
    addCondition(userId: string, conditionData: CreateConditionDTO): Promise<MedicalCondition>;
    /**
     * Get audit log for a user's medical profile
     */
    getAuditLog(userId: string, options?: {
        limit?: number;
        offset?: number;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{
        logs: MedicalAccessAudit[];
        total: number;
    }>;
}
declare const _default: MedicalService;
export default _default;
//# sourceMappingURL=medical.service.d.ts.map