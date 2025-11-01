import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  CreatedAt,
} from 'sequelize-typescript';

export enum AccessReason {
  EMERGENCY = 'emergency',
  ROUTINE_CARE = 'routine_care',
  USER_REQUEST = 'user_request',
  EMERGENCY_CONTACT = 'emergency_contact',
  FIRST_RESPONDER = 'first_responder',
  ADMINISTRATIVE = 'administrative',
  SYSTEM = 'system',
}

export enum AccessRole {
  USER = 'user',
  EMERGENCY_CONTACT = 'emergency_contact',
  FIRST_RESPONDER = 'first_responder',
  PHYSICIAN = 'physician',
  ADMIN = 'admin',
  SYSTEM = 'system',
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
@Table({
  tableName: 'medical_access_audit',
  timestamps: false, // We use a custom timestamp field
  paranoid: false, // No soft deletes - audit logs are immutable
})
export default class MedicalAccessAudit extends Model<
  MedicalAccessAuditAttributes,
  MedicalAccessAuditCreationAttributes
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
    comment: 'Reference to medical profile that was accessed',
  })
  medicalProfileId!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    comment: 'ID of user/system that accessed the data',
  })
  accessedBy!: string;

  @Column({
    type: DataType.ENUM(...Object.values(AccessRole)),
    allowNull: false,
    comment: 'Role of the accessor',
  })
  accessedByRole!: AccessRole;

  @Column({
    type: DataType.ENUM(...Object.values(AccessReason)),
    allowNull: false,
    comment: 'Reason for accessing medical data',
  })
  reason!: AccessReason;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    comment: 'Action performed (view, update, delete, export)',
  })
  action!: string;

  @Column({
    type: DataType.INET,
    allowNull: true,
    comment: 'IP address of the accessor',
  })
  ipAddress?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'User agent string from the request',
  })
  userAgent?: string;

  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'Emergency ID if access was during an emergency',
  })
  emergencyId?: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
    comment: 'Hashed access token used (for verification)',
  })
  accessToken?: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    comment: 'List of specific data fields accessed',
  })
  dataAccessed?: string[];

  @CreatedAt
  @Default(DataType.NOW)
  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'timestamp',
    comment: 'Timestamp of access (immutable)',
  })
  timestamp!: Date;

  /**
   * Get safe object for API response
   */
  public toSafeObject(): any {
    return {
      id: this.id,
      accessedBy: this.accessedBy,
      accessedByRole: this.accessedByRole,
      reason: this.reason,
      action: this.action,
      ipAddress: this.ipAddress,
      emergencyId: this.emergencyId,
      dataAccessed: this.dataAccessed,
      timestamp: this.timestamp,
    };
  }

  /**
   * Check if access was during an emergency
   */
  public isEmergencyAccess(): boolean {
    return (
      this.reason === AccessReason.EMERGENCY ||
      this.reason === AccessReason.FIRST_RESPONDER ||
      this.reason === AccessReason.EMERGENCY_CONTACT
    );
  }

  /**
   * Check if access was authorized
   */
  public isAuthorizedAccess(): boolean {
    return (
      this.accessedByRole === AccessRole.USER ||
      this.accessedByRole === AccessRole.PHYSICIAN ||
      (this.accessedByRole === AccessRole.EMERGENCY_CONTACT && this.emergencyId !== undefined) ||
      (this.accessedByRole === AccessRole.FIRST_RESPONDER && this.emergencyId !== undefined)
    );
  }
}
