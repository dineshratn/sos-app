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
  Index,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import UserProfile from './UserProfile';

export enum ContactRelationship {
  SPOUSE = 'spouse',
  PARENT = 'parent',
  CHILD = 'child',
  SIBLING = 'sibling',
  FRIEND = 'friend',
  PARTNER = 'partner',
  RELATIVE = 'relative',
  GUARDIAN = 'guardian',
  CAREGIVER = 'caregiver',
  NEIGHBOR = 'neighbor',
  COLLEAGUE = 'colleague',
  OTHER = 'other',
}

export enum ContactPriority {
  CRITICAL = 1,
  HIGH = 2,
  MEDIUM = 3,
  LOW = 4,
}

export interface EmergencyContactAttributes {
  id?: string;
  userProfileId: string;
  name: string;
  relationship: ContactRelationship;
  phoneNumber: string;
  alternatePhoneNumber?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  isPrimary?: boolean;
  priority?: number;
  notes?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

@Table({
  tableName: 'emergency_contacts',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export default class EmergencyContact extends Model<EmergencyContactAttributes> {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => UserProfile)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userProfileId!: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.ENUM(...Object.values(ContactRelationship)),
    allowNull: false,
  })
  relationship!: ContactRelationship;

  @Index
  @Column({
    type: DataType.STRING(20),
    allowNull: false,
  })
  phoneNumber!: string;

  @Column(DataType.STRING(20))
  alternatePhoneNumber?: string;

  @Column(DataType.STRING(255))
  email?: string;

  @Column(DataType.TEXT)
  address?: string;

  @Column(DataType.STRING(100))
  city?: string;

  @Column(DataType.STRING(100))
  state?: string;

  @Column(DataType.STRING(100))
  country?: string;

  @Column(DataType.STRING(20))
  postalCode?: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isPrimary!: boolean;

  @Default(1)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  priority!: number;

  @Column(DataType.TEXT)
  notes?: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  @CreatedAt
  @Column(DataType.DATE)
  declare createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  declare updatedAt: Date;

  @DeletedAt
  @Column(DataType.DATE)
  declare deletedAt: Date | null;

  // Associations
  @BelongsTo(() => UserProfile)
  userProfile!: UserProfile;

  /**
   * Check if contact has complete information
   */
  public isComplete(): boolean {
    return !!(this.name && this.phoneNumber && this.relationship);
  }

  /**
   * Get display name with relationship
   */
  public getDisplayName(): string {
    return `${this.name} (${this.relationship})`;
  }

  /**
   * Return safe object
   */
  public toSafeObject(): Partial<EmergencyContactAttributes> {
    return {
      id: this.id,
      userProfileId: this.userProfileId,
      name: this.name,
      relationship: this.relationship,
      phoneNumber: this.phoneNumber,
      alternatePhoneNumber: this.alternatePhoneNumber,
      email: this.email,
      address: this.address,
      city: this.city,
      state: this.state,
      country: this.country,
      postalCode: this.postalCode,
      isPrimary: this.isPrimary,
      priority: this.priority,
      notes: this.notes,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Return minimal contact info (for notifications)
   */
  public toMinimalContact(): {
    id: string;
    name: string;
    phoneNumber: string;
    relationship: ContactRelationship;
  } {
    return {
      id: this.id,
      name: this.name,
      phoneNumber: this.phoneNumber,
      relationship: this.relationship,
    };
  }
}
