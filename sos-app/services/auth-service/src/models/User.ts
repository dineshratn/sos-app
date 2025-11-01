import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  Unique,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  Index,
  HasMany,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import Session from './Session';

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  APPLE = 'apple',
}

export interface UserAttributes {
  id: string;
  email: string;
  phoneNumber?: string;
  passwordHash?: string;
  authProvider: AuthProvider;
  providerId?: string;
  firstName?: string;
  lastName?: string;
  mfaEnabled: boolean;
  mfaSecret?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  accountLockedUntil?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface UserCreationAttributes {
  email: string;
  phoneNumber?: string;
  passwordHash?: string;
  authProvider: AuthProvider;
  providerId?: string;
  firstName?: string;
  lastName?: string;
}

@Table({
  tableName: 'users',
  timestamps: true,
  paranoid: true, // Soft deletes
  underscored: true,
  indexes: [
    { fields: ['email'] },
    { fields: ['phone_number'] },
    { fields: ['auth_provider', 'provider_id'] },
  ],
})
export default class User extends Model<UserAttributes, UserCreationAttributes> {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @Unique
  @AllowNull(false)
  @Index
  @Column(DataType.STRING(255))
  email!: string;

  @Unique
  @Index
  @Column(DataType.STRING(20))
  phoneNumber?: string;

  @Column(DataType.STRING(255))
  passwordHash?: string;

  @Default(AuthProvider.LOCAL)
  @Column(DataType.ENUM(...Object.values(AuthProvider)))
  authProvider!: AuthProvider;

  @Column(DataType.STRING(255))
  providerId?: string;

  @Column(DataType.STRING(100))
  firstName?: string;

  @Column(DataType.STRING(100))
  lastName?: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  mfaEnabled!: boolean;

  @Column(DataType.STRING(255))
  mfaSecret?: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  emailVerified!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  phoneVerified!: boolean;

  @Column(DataType.DATE)
  lastLoginAt?: Date;

  @Default(0)
  @Column(DataType.INTEGER)
  failedLoginAttempts!: number;

  @Column(DataType.DATE)
  accountLockedUntil?: Date;

  @Column(DataType.STRING(255))
  passwordResetToken?: string;

  @Column(DataType.DATE)
  passwordResetExpires?: Date;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @DeletedAt
  deletedAt?: Date;

  // Associations
  @HasMany(() => Session)
  sessions?: Session[];

  // Instance methods
  public isAccountLocked(): boolean {
    if (!this.accountLockedUntil) {
      return false;
    }
    return new Date() < this.accountLockedUntil;
  }

  public incrementFailedLoginAttempts(): void {
    this.failedLoginAttempts += 1;

    // Lock account after 5 failed attempts for 15 minutes
    if (this.failedLoginAttempts >= 5) {
      this.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
  }

  public resetFailedLoginAttempts(): void {
    this.failedLoginAttempts = 0;
    this.accountLockedUntil = undefined;
  }

  public updateLastLogin(): void {
    this.lastLoginAt = new Date();
  }

  public toSafeObject(): Partial<UserAttributes> {
    return {
      id: this.id,
      email: this.email,
      phoneNumber: this.phoneNumber,
      authProvider: this.authProvider,
      firstName: this.firstName,
      lastName: this.lastName,
      mfaEnabled: this.mfaEnabled,
      emailVerified: this.emailVerified,
      phoneVerified: this.phoneVerified,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
