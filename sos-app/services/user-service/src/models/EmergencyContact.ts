import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  Index,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import UserProfile from './UserProfile';

export enum ContactPriority {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TERTIARY = 'tertiary',
}

export enum ContactRelationship {
  SPOUSE = 'spouse',
  PARENT = 'parent',
  CHILD = 'child',
  SIBLING = 'sibling',
  FRIEND = 'friend',
  COWORKER = 'coworker',
  NEIGHBOR = 'neighbor',
  CAREGIVER = 'caregiver',
  OTHER = 'other',
}

export interface EmergencyContactAttributes {
  id: string;
  userId: string; // Foreign key to users table in auth-service
  userProfileId: string; // Foreign key to user_profiles table
  name: string;
  phoneNumber: string;
  email?: string;
  relationship: ContactRelationship;
  priority: ContactPriority;
  address?: string;
  notes?: string;
  isVerified: boolean;
  lastNotifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface EmergencyContactCreationAttributes {
  userId: string;
  userProfileId: string;
  name: string;
  phoneNumber: string;
  email?: string;
  relationship: ContactRelationship;
  priority: ContactPriority;
  address?: string;
  notes?: string;
}

@Table({
  tableName: 'emergency_contacts',
  timestamps: true,
  paranoid: true, // Soft deletes
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['user_profile_id'] },
    { fields: ['user_id', 'priority'] },
    { fields: ['phone_number'] },
    { fields: ['created_at'] },
  ],
})
export default class EmergencyContact extends Model<
  EmergencyContactAttributes,
  EmergencyContactCreationAttributes
> {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  userId!: string;

  @AllowNull(false)
  @ForeignKey(() => UserProfile)
  @Index
  @Column(DataType.UUID)
  userProfileId!: string;

  @AllowNull(false)
  @Column(DataType.STRING(200))
  name!: string;

  @AllowNull(false)
  @Index
  @Column(DataType.STRING(20))
  phoneNumber!: string;

  @Column(DataType.STRING(255))
  email?: string;

  @AllowNull(false)
  @Column(DataType.ENUM(...Object.values(ContactRelationship)))
  relationship!: ContactRelationship;

  @AllowNull(false)
  @Default(ContactPriority.PRIMARY)
  @Index
  @Column(DataType.ENUM(...Object.values(ContactPriority)))
  priority!: ContactPriority;

  @Column(DataType.TEXT)
  address?: string;

  @Column(DataType.TEXT)
  notes?: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isVerified!: boolean;

  @Column(DataType.DATE)
  lastNotifiedAt?: Date;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @DeletedAt
  deletedAt?: Date;

  // Associations
  @BelongsTo(() => UserProfile)
  userProfile?: UserProfile;

  // Instance methods
  public getPriorityLevel(): number {
    switch (this.priority) {
      case ContactPriority.PRIMARY:
        return 1;
      case ContactPriority.SECONDARY:
        return 2;
      case ContactPriority.TERTIARY:
        return 3;
      default:
        return 99;
    }
  }

  public toSafeObject(): Partial<EmergencyContactAttributes> {
    return {
      id: this.id,
      userId: this.userId,
      name: this.name,
      phoneNumber: this.phoneNumber,
      email: this.email,
      relationship: this.relationship,
      priority: this.priority,
      address: this.address,
      notes: this.notes,
      isVerified: this.isVerified,
      lastNotifiedAt: this.lastNotifiedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
