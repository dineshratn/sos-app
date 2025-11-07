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

export enum ConditionSeverity {
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  CRITICAL = 'critical',
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

@Table({
  tableName: 'medical_conditions',
  timestamps: true,
  paranoid: true,
})
export default class MedicalCondition extends Model<
  MedicalConditionAttributes,
  MedicalConditionCreationAttributes
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
    comment: 'Medical condition name',
  })
  conditionName!: string;

  @Column({
    type: DataType.ENUM(...Object.values(ConditionSeverity)),
    allowNull: true,
    comment: 'Severity of the condition',
  })
  severity?: ConditionSeverity;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
    comment: 'Date when condition was diagnosed',
  })
  diagnosedDate?: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether condition is chronic (long-term)',
  })
  isChronic!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether condition is currently active',
  })
  isActive!: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Additional notes about the condition',
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
      conditionName: this.conditionName,
      severity: this.severity,
      diagnosedDate: this.diagnosedDate,
      isChronic: this.isChronic,
      isActive: this.isActive,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Check if condition is critical
   */
  public isCriticalCondition(): boolean {
    return (
      this.severity === ConditionSeverity.SEVERE ||
      this.severity === ConditionSeverity.CRITICAL
    );
  }

  /**
   * Mark condition as resolved
   */
  public async resolve(): Promise<void> {
    this.isActive = false;
    await this.save();
  }

  /**
   * Reactivate condition
   */
  public async reactivate(): Promise<void> {
    this.isActive = true;
    await this.save();
  }
}
