import { Model } from 'sequelize-typescript';
import MedicalProfile from './MedicalProfile';
export declare enum ConditionSeverity {
    MILD = "mild",
    MODERATE = "moderate",
    SEVERE = "severe",
    CRITICAL = "critical"
}
export interface MedicalConditionAttributes {
    id: string;
    medicalProfileId: string;
    conditionName: string;
    severity?: ConditionSeverity;
    diagnosedDate?: Date;
    isChronic: boolean;
    isActive: boolean;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}
export interface MedicalConditionCreationAttributes {
    medicalProfileId: string;
    conditionName: string;
    severity?: ConditionSeverity;
    diagnosedDate?: Date;
    isChronic?: boolean;
    isActive?: boolean;
    notes?: string;
}
export default class MedicalCondition extends Model<MedicalConditionAttributes, MedicalConditionCreationAttributes> {
    id: string;
    medicalProfileId: string;
    conditionName: string;
    severity?: ConditionSeverity;
    diagnosedDate?: Date;
    isChronic: boolean;
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
     * Check if condition is critical
     */
    isCriticalCondition(): boolean;
    /**
     * Mark condition as resolved
     */
    resolve(): Promise<void>;
    /**
     * Reactivate condition
     */
    reactivate(): Promise<void>;
}
//# sourceMappingURL=MedicalCondition.d.ts.map