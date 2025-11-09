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

export enum AllergySeverity {
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  LIFE_THREATENING = 'life_threatening',
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

@Table({
  tableName: 'medical_allergies',
  timestamps: true,
  paranoid: true,
})
export default class MedicalAllergy extends Model<
  MedicalAllergyAttributes,
  MedicalAllergyCreationAttributes
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
    comment: 'Allergen name (e.g., Penicillin, Peanuts)',
  })
  allergen!: string;

  @Column({
    type: DataType.ENUM(...Object.values(AllergySeverity)),
    allowNull: false,
    comment: 'Severity of allergic reaction',
  })
  severity!: AllergySeverity;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
    comment: 'Description of allergic reaction',
  })
  reaction?: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
    comment: 'Date when allergy was diagnosed',
  })
  diagnosedDate?: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Additional notes about the allergy',
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
      allergen: this.allergen,
      severity: this.severity,
      reaction: this.reaction,
      diagnosedDate: this.diagnosedDate,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Check if allergy is critical (severe or life-threatening)
   */
  public isCritical(): boolean {
    return (
      this.severity === AllergySeverity.SEVERE ||
      this.severity === AllergySeverity.LIFE_THREATENING
    );
  }
}
