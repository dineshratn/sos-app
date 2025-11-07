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
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
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

@Table({
  tableName: 'medical_medications',
  timestamps: true,
  paranoid: true,
})
export default class MedicalMedication extends Model<
  MedicalMedicationAttributes,
  MedicalMedicationCreationAttributes
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => MedicalProfile)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    comment: 'Reference to medical profile',
  })
  medicalProfileId!: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: false,
    comment: 'Medication name',
  })
  medicationName!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    comment: 'Dosage (e.g., 10mg, 500mg)',
  })
  dosage?: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: true,
    comment: 'Frequency (e.g., twice daily, as needed)',
  })
  frequency?: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    comment: 'Route of administration (oral, injection, topical, etc.)',
  })
  route?: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: true,
    comment: 'Prescribing physician name',
  })
  prescribedBy?: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
    comment: 'Date when medication was started',
  })
  startDate?: Date;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
    comment: 'Date when medication was discontinued',
  })
  endDate?: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether medication is currently active',
  })
  isActive!: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Additional notes about the medication',
  })
  notes?: string;

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updatedAt!: Date;

  @DeletedAt
  @Column(DataType.DATE)
  deletedAt?: Date;

  // Association
  @BelongsTo(() => MedicalProfile)
  medicalProfile?: MedicalProfile;

  /**
   * Get safe object for API response
   */
  public toSafeObject(): any {
    return {
      id: this.id,
      medicationName: this.medicationName,
      dosage: this.dosage,
      frequency: this.frequency,
      route: this.route,
      prescribedBy: this.prescribedBy,
      startDate: this.startDate,
      endDate: this.endDate,
      isActive: this.isActive,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Mark medication as discontinued
   */
  public async discontinue(endDate?: Date): Promise<void> {
    this.isActive = false;
    this.endDate = endDate || new Date();
    await this.save();
  }

  /**
   * Reactivate medication
   */
  public async reactivate(): Promise<void> {
    this.isActive = true;
    this.endDate = undefined;
    await this.save();
  }
}
