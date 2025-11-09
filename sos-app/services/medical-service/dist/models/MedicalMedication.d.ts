import { Model } from 'sequelize-typescript';
import MedicalProfile from './MedicalProfile';
export interface MedicalMedicationAttributes {
    id: string;
    medicalProfileId: string;
    medicationName: string;
    dosage?: string;
    frequency?: string;
    route?: string;
    prescribedBy?: string;
    startDate?: Date;
    endDate?: Date;
    isActive: boolean;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}
export interface MedicalMedicationCreationAttributes {
    medicalProfileId: string;
    medicationName: string;
    dosage?: string;
    frequency?: string;
    route?: string;
    prescribedBy?: string;
    startDate?: Date;
    endDate?: Date;
    isActive?: boolean;
    notes?: string;
}
export default class MedicalMedication extends Model<MedicalMedicationAttributes, MedicalMedicationCreationAttributes> {
    id: string;
    medicalProfileId: string;
    medicationName: string;
    dosage?: string;
    frequency?: string;
    route?: string;
    prescribedBy?: string;
    startDate?: Date;
    endDate?: Date;
    isActive: boolean;
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
     * Mark medication as discontinued
     */
    discontinue(endDate?: Date): Promise<void>;
    /**
     * Reactivate medication
     */
    reactivate(): Promise<void>;
}
//# sourceMappingURL=MedicalMedication.d.ts.map