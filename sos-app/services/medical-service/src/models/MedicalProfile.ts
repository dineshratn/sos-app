import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  HasMany,
} from 'sequelize-typescript';
import { encrypt, decrypt } from '../utils/encryption';
import MedicalAllergy from './MedicalAllergy';
import MedicalMedication from './MedicalMedication';
import MedicalCondition from './MedicalCondition';

export enum BloodType {
  A_POSITIVE = 'A+',
  A_NEGATIVE = 'A-',
  B_POSITIVE = 'B+',
  B_NEGATIVE = 'B-',
  AB_POSITIVE = 'AB+',
  AB_NEGATIVE = 'AB-',
  O_POSITIVE = 'O+',
  O_NEGATIVE = 'O-',
  UNKNOWN = 'Unknown',
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

@Table({
  tableName: 'medical_profiles',
  timestamps: true,
  paranoid: true, // Soft delete for HIPAA compliance
})
export default class MedicalProfile extends Model<
  MedicalProfileAttributes,
  MedicalProfileCreationAttributes
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true,
    comment: 'Reference to user in auth service',
  })
  userId!: string;

  // Blood type - stored in plaintext for emergency access
  @Column({
    type: DataType.ENUM(...Object.values(BloodType)),
    allowNull: true,
    comment: 'Blood type (stored in plaintext for quick emergency access)',
  })
  bloodType?: BloodType;

  // Encrypted blood type backup
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'blood_type_encrypted',
    comment: 'Encrypted blood type backup',
  })
  bloodTypeEncrypted?: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
    comment: 'Organ donor status',
  })
  organDonor?: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
    comment: 'Do not resuscitate (DNR) directive',
  })
  doNotResuscitate?: boolean;

  // Emergency notes - encrypted
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'emergency_notes_encrypted',
    comment: 'Encrypted emergency medical notes',
  })
  emergencyNotesEncrypted?: string;

  // Primary physician - encrypted
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'primary_physician_encrypted',
    comment: 'Encrypted primary physician name',
  })
  primaryPhysicianEncrypted?: string;

  // Primary physician phone - encrypted
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'primary_physician_phone_encrypted',
    comment: 'Encrypted primary physician phone number',
  })
  primaryPhysicianPhoneEncrypted?: string;

  // Insurance provider - encrypted
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'insurance_provider_encrypted',
    comment: 'Encrypted insurance provider name',
  })
  insuranceProviderEncrypted?: string;

  // Insurance policy number - encrypted
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'insurance_policy_number_encrypted',
    comment: 'Encrypted insurance policy number',
  })
  insurancePolicyNumberEncrypted?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'Last time user reviewed and confirmed their medical information',
  })
  lastReviewedAt?: Date;

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updatedAt!: Date;

  @DeletedAt
  @Column(DataType.DATE)
  deletedAt?: Date;

  // Associations
  @HasMany(() => MedicalAllergy, {
    foreignKey: 'medicalProfileId',
    onDelete: 'CASCADE',
  })
  allergies?: MedicalAllergy[];

  @HasMany(() => MedicalMedication, {
    foreignKey: 'medicalProfileId',
    onDelete: 'CASCADE',
  })
  medications?: MedicalMedication[];

  @HasMany(() => MedicalCondition, {
    foreignKey: 'medicalProfileId',
    onDelete: 'CASCADE',
  })
  conditions?: MedicalCondition[];

  // Virtual fields for decrypted data
  get emergencyNotes(): string | null {
    return decrypt(this.emergencyNotesEncrypted);
  }

  set emergencyNotes(value: string | null | undefined) {
    this.emergencyNotesEncrypted = encrypt(value) || undefined;
  }

  get primaryPhysician(): string | null {
    return decrypt(this.primaryPhysicianEncrypted);
  }

  set primaryPhysician(value: string | null | undefined) {
    this.primaryPhysicianEncrypted = encrypt(value) || undefined;
  }

  get primaryPhysicianPhone(): string | null {
    return decrypt(this.primaryPhysicianPhoneEncrypted);
  }

  set primaryPhysicianPhone(value: string | null | undefined) {
    this.primaryPhysicianPhoneEncrypted = encrypt(value) || undefined;
  }

  get insuranceProvider(): string | null {
    return decrypt(this.insuranceProviderEncrypted);
  }

  set insuranceProvider(value: string | null | undefined) {
    this.insuranceProviderEncrypted = encrypt(value) || undefined;
  }

  get insurancePolicyNumber(): string | null {
    return decrypt(this.insurancePolicyNumberEncrypted);
  }

  set insurancePolicyNumber(value: string | null | undefined) {
    this.insurancePolicyNumberEncrypted = encrypt(value) || undefined;
  }

  /**
   * Check if profile needs review (older than 6 months)
   */
  public needsReview(): boolean {
    if (!this.lastReviewedAt) {
      return true;
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return this.lastReviewedAt < sixMonthsAgo;
  }

  /**
   * Mark profile as reviewed
   */
  public async markAsReviewed(): Promise<void> {
    this.lastReviewedAt = new Date();
    await this.save();
  }

  /**
   * Get safe object for API response (excludes encrypted fields)
   */
  public toSafeObject(): any {
    return {
      id: this.id,
      userId: this.userId,
      bloodType: this.bloodType,
      organDonor: this.organDonor,
      doNotResuscitate: this.doNotResuscitate,
      emergencyNotes: this.emergencyNotes,
      primaryPhysician: this.primaryPhysician,
      primaryPhysicianPhone: this.primaryPhysicianPhone,
      insuranceProvider: this.insuranceProvider,
      insurancePolicyNumber: this.insurancePolicyNumber,
      lastReviewedAt: this.lastReviewedAt,
      needsReview: this.needsReview(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Get minimal emergency object (for first responders)
   * Only includes critical, life-saving information
   */
  public toEmergencyObject(): any {
    return {
      bloodType: this.bloodType,
      organDonor: this.organDonor,
      doNotResuscitate: this.doNotResuscitate,
      emergencyNotes: this.emergencyNotes,
      allergies: this.allergies?.map((a) => a.toSafeObject()) || [],
      medications: this.medications?.map((m) => m.toSafeObject()) || [],
      conditions: this.conditions?.map((c) => c.toSafeObject()) || [],
    };
  }
}
