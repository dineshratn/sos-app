import { Model } from 'sequelize-typescript';
import MedicalProfile from './MedicalProfile';
export declare enum AllergySeverity {
    MILD = "mild",
    MODERATE = "moderate",
    SEVERE = "severe",
    LIFE_THREATENING = "life_threatening"
}
export interface MedicalAllergyAttributes {
    id: string;
    medicalProfileId: string;
    allergen: string;
    severity: AllergySeverity;
    reaction?: string;
    diagnosedDate?: Date;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}
export interface MedicalAllergyCreationAttributes {
    medicalProfileId: string;
    allergen: string;
    severity: AllergySeverity;
    reaction?: string;
    diagnosedDate?: Date;
    notes?: string;
}
export default class MedicalAllergy extends Model<MedicalAllergyAttributes, MedicalAllergyCreationAttributes> {
    id: string;
    medicalProfileId: string;
    allergen: string;
    severity: AllergySeverity;
    reaction?: string;
    diagnosedDate?: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
    medicalProfile?: MedicalProfile;
    /**
     * Get safe object for API response
     */
    toSafeObject(): any;
    /**
     * Check if allergy is critical (severe or life-threatening)
     */
    isCritical(): boolean;
}
//# sourceMappingURL=MedicalAllergy.d.ts.map