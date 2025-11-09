import { Model } from 'sequelize-typescript';
export declare enum AccessReason {
    EMERGENCY = "emergency",
    ROUTINE_CARE = "routine_care",
    USER_REQUEST = "user_request",
    EMERGENCY_CONTACT = "emergency_contact",
    FIRST_RESPONDER = "first_responder",
    ADMINISTRATIVE = "administrative",
    SYSTEM = "system"
}
export declare enum AccessRole {
    USER = "user",
    EMERGENCY_CONTACT = "emergency_contact",
    FIRST_RESPONDER = "first_responder",
    PHYSICIAN = "physician",
    ADMIN = "admin",
    SYSTEM = "system"
}
export interface MedicalAccessAuditAttributes {
    id: string;
    medicalProfileId: string;
    accessedBy: string;
    accessedByRole: AccessRole;
    reason: AccessReason;
    action: string;
    ipAddress?: string;
    userAgent?: string;
    emergencyId?: string;
    accessToken?: string;
    dataAccessed?: string[];
    timestamp: Date;
}
export interface MedicalAccessAuditCreationAttributes {
    medicalProfileId: string;
    accessedBy: string;
    accessedByRole: AccessRole;
    reason: AccessReason;
    action: string;
    ipAddress?: string;
    userAgent?: string;
    emergencyId?: string;
    accessToken?: string;
    dataAccessed?: string[];
}
/**
 * Medical Access Audit Log
 *
 * HIPAA requires comprehensive audit logging for all access to PHI (Protected Health Information).
 * This table is append-only and immutable for compliance purposes.
 */
export default class MedicalAccessAudit extends Model<MedicalAccessAuditAttributes, MedicalAccessAuditCreationAttributes> {
    id: string;
    medicalProfileId: string;
    accessedBy: string;
    accessedByRole: AccessRole;
    reason: AccessReason;
    action: string;
    ipAddress?: string;
    userAgent?: string;
    emergencyId?: string;
    accessToken?: string;
    dataAccessed?: string[];
    timestamp: Date;
    /**
     * Get safe object for API response
     */
    toSafeObject(): any;
    /**
     * Check if access was during an emergency
     */
    isEmergencyAccess(): boolean;
    /**
     * Check if access was authorized
     */
    isAuthorizedAccess(): boolean;
}
//# sourceMappingURL=MedicalAccessAudit.d.ts.map