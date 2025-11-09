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
  emailVerified?: boolean;
  phoneVerified?: boolean;
  mfaEnabled?: boolean;
  mfaSecret?: string;
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
  declare id: string;

  @Unique
  @AllowNull(false)
  @Index
  @Column(DataType.STRING(255))
  declare email: string;

  @Unique
  @Index
  @Column(DataType.STRING(20))
  declare phoneNumber?: string;

  @Column(DataType.STRING(255))
  declare passwordHash?: string;

  @Default(AuthProvider.LOCAL)
  @Column(DataType.ENUM(...Object.values(AuthProvider)))
  declare authProvider: AuthProvider;

  @Column(DataType.STRING(255))
  declare providerId?: string;

  @Column(DataType.STRING(100))
  declare firstName?: string;

  @Column(DataType.STRING(100))
  declare lastName?: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare mfaEnabled: boolean;

  @Column(DataType.STRING(255))
  declare mfaSecret?: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare emailVerified: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare phoneVerified: boolean;

  @Column(DataType.DATE)
  declare lastLoginAt?: Date;

  @Default(0)
  @Column(DataType.INTEGER)
  declare failedLoginAttempts: number;

  @Column(DataType.DATE)
  declare accountLockedUntil?: Date;

  @Column(DataType.STRING(255))
  declare passwordResetToken?: string;

  @Column(DataType.DATE)
  declare passwordResetExpires?: Date;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @DeletedAt
  declare deletedAt?: Date;

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
