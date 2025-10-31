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
  Index,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import EmergencyContact from './EmergencyContact';

export interface UserProfileAttributes {
  id: string;
  userId: string; // References user in auth service
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  medicalConditions?: string;
  allergies?: string;
  medications?: string;
  emergencyNotes?: string;
  profilePictureUrl?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

@Table({
  tableName: 'user_profiles',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export default class UserProfile extends Model<UserProfileAttributes> {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @Index
  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true,
  })
  userId!: string;

  @Column(DataType.STRING(100))
  firstName?: string;

  @Column(DataType.STRING(100))
  lastName?: string;

  @Column(DataType.DATEONLY)
  dateOfBirth?: Date;

  @Column(DataType.ENUM('male', 'female', 'other', 'prefer_not_to_say'))
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';

  @Index
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

  @Column(DataType.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'))
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

  @Column(DataType.TEXT)
  medicalConditions?: string;

  @Column(DataType.TEXT)
  allergies?: string;

  @Column(DataType.TEXT)
  medications?: string;

  @Column(DataType.TEXT)
  emergencyNotes?: string;

  @Column(DataType.STRING(500))
  profilePictureUrl?: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

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
  @HasMany(() => EmergencyContact)
  emergencyContacts!: EmergencyContact[];

  /**
   * Get full name
   */
  public getFullName(): string {
    const parts = [];
    if (this.firstName) parts.push(this.firstName);
    if (this.lastName) parts.push(this.lastName);
    return parts.join(' ') || 'Unknown';
  }

  /**
   * Check if profile is complete
   * (has minimum required information)
   */
  public isProfileComplete(): boolean {
    return !!(
      this.firstName &&
      this.lastName &&
      this.phoneNumber &&
      this.dateOfBirth
    );
  }

  /**
   * Get age from date of birth
   */
  public getAge(): number | null {
    if (!this.dateOfBirth) return null;

    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Return safe object (without sensitive data if needed)
   */
  public toSafeObject(): Partial<UserProfileAttributes> {
    return {
      id: this.id,
      userId: this.userId,
      firstName: this.firstName,
      lastName: this.lastName,
      dateOfBirth: this.dateOfBirth,
      gender: this.gender,
      phoneNumber: this.phoneNumber,
      address: this.address,
      city: this.city,
      state: this.state,
      country: this.country,
      postalCode: this.postalCode,
      bloodType: this.bloodType,
      medicalConditions: this.medicalConditions,
      allergies: this.allergies,
      medications: this.medications,
      emergencyNotes: this.emergencyNotes,
      profilePictureUrl: this.profilePictureUrl,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Return minimal public profile
   * (for sharing with emergency contacts)
   */
  public toPublicProfile(): Partial<UserProfileAttributes> {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      phoneNumber: this.phoneNumber,
      profilePictureUrl: this.profilePictureUrl,
    };
  }
}
