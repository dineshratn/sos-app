import { Model } from 'sequelize-typescript';
import MedicalAllergy from './MedicalAllergy';
import MedicalMedication from './MedicalMedication';
import MedicalCondition from './MedicalCondition';
export declare enum BloodType {
    A_POSITIVE = "A+",
    A_NEGATIVE = "A-",
    B_POSITIVE = "B+",
    B_NEGATIVE = "B-",
    AB_POSITIVE = "AB+",
    AB_NEGATIVE = "AB-",
    O_POSITIVE = "O+",
    O_NEGATIVE = "O-",
    UNKNOWN = "Unknown"
}
export interface MedicalProfileAttributes {
    id: string;
    userId: string;
    bloodType?: BloodType;
    bloodTypeEncrypted?: string;
    organDonor?: boolean;
    doNotResuscitate?: boolean;
    emergencyNotes?: string;
    emergencyNotesEncrypted?: string;
    primaryPhysician?: string;
    primaryPhysicianEncrypted?: string;
    primaryPhysicianPhone?: string;
    primaryPhysicianPhoneEncrypted?: string;
    insuranceProvider?: string;
    insuranceProviderEncrypted?: string;
    insurancePolicyNumber?: string;
    insurancePolicyNumberEncrypted?: string;
    lastReviewedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}
export interface MedicalProfileCreationAttributes {
    userId: string;
    bloodType?: BloodType;
    organDonor?: boolean;
    doNotResuscitate?: boolean;
    emergencyNotes?: string;
    primaryPhysician?: string;
    primaryPhysicianPhone?: string;
    insuranceProvider?: string;
    insurancePolicyNumber?: string;
}
export default class MedicalProfile extends Model<MedicalProfileAttributes, MedicalProfileCreationAttributes> {
    id: string;
    userId: string;
    bloodType?: BloodType;
    bloodTypeEncrypted?: string;
    organDonor?: boolean;
    doNotResuscitate?: boolean;
    emergencyNotesEncrypted?: string;
    primaryPhysicianEncrypted?: string;
    primaryPhysicianPhoneEncrypted?: string;
    insuranceProviderEncrypted?: string;
    insurancePolicyNumberEncrypted?: string;
    lastReviewedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
    allergies?: MedicalAllergy[];
    medications?: MedicalMedication[];
    conditions?: MedicalCondition[];
    get emergencyNotes(): string | null;
    set emergencyNotes(value: string | null | undefined);
    get primaryPhysician(): string | null;
    set primaryPhysician(value: string | null | undefined);
    get primaryPhysicianPhone(): string | null;
    set primaryPhysicianPhone(value: string | null | undefined);
    get insuranceProvider(): string | null;
    set insuranceProvider(value: string | null | undefined);
    get insurancePolicyNumber(): string | null;
    set insurancePolicyNumber(value: string | null | undefined);
    /**
     * Check if profile needs review (older than 6 months)
     */
    needsReview(): boolean;
    /**
     * Mark profile as reviewed
     */
    markAsReviewed(): Promise<void>;
    /**
     * Get safe object for API response (excludes encrypted fields)
     */
    toSafeObject(): any;
    /**
     * Get minimal emergency object (for first responders)
     * Only includes critical, life-saving information
     */
    toEmergencyObject(): any;
}
//# sourceMappingURL=MedicalProfile.d.ts.map