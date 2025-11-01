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
  HasMany,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import EmergencyContact from './EmergencyContact';

export interface UserProfileAttributes {
  id: string;
  userId: string; // Foreign key to users table in auth-service
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  profilePictureUrl?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
  language?: string;
  notificationPreferences?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface UserProfileCreationAttributes {
  userId: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  phoneNumber?: string;
}

@Table({
  tableName: 'user_profiles',
  timestamps: true,
  paranoid: true, // Soft deletes
  underscored: true,
  indexes: [
    { fields: ['user_id'], unique: true },
    { fields: ['created_at'] },
  ],
})
export default class UserProfile extends Model<UserProfileAttributes, UserProfileCreationAttributes> {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  userId!: string;

  @Column(DataType.STRING(100))
  firstName?: string;

  @Column(DataType.STRING(100))
  lastName?: string;

  @Column(DataType.DATEONLY)
  dateOfBirth?: Date;

  @Column(DataType.STRING(500))
  profilePictureUrl?: string;

  @Column(DataType.STRING(20))
  phoneNumber?: string;

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

  @Column(DataType.STRING(50))
  timezone?: string;

  @Default('en')
  @Column(DataType.STRING(10))
  language?: string;

  @Column(DataType.JSONB)
  notificationPreferences?: Record<string, any>;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @DeletedAt
  deletedAt?: Date;

  // Associations
  @HasMany(() => EmergencyContact)
  emergencyContacts?: EmergencyContact[];

  // Instance methods
  public getFullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.firstName || this.lastName || 'Unknown';
  }

  public getAge(): number | null {
    if (!this.dateOfBirth) {
      return null;
    }
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  public toSafeObject(): Partial<UserProfileAttributes> {
    return {
      id: this.id,
      userId: this.userId,
      firstName: this.firstName,
      lastName: this.lastName,
      dateOfBirth: this.dateOfBirth,
      profilePictureUrl: this.profilePictureUrl,
      phoneNumber: this.phoneNumber,
      address: this.address,
      city: this.city,
      state: this.state,
      country: this.country,
      postalCode: this.postalCode,
      timezone: this.timezone,
      language: this.language,
      notificationPreferences: this.notificationPreferences,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
