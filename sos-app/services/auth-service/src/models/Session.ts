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
  ForeignKey,
  BelongsTo,
  Index,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import User from './User';

export interface SessionAttributes {
  id: string;
  userId: string;
  deviceId: string;
  deviceName?: string;
  deviceType?: string;
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionCreationAttributes {
  userId: string;
  deviceId: string;
  deviceName?: string;
  deviceType?: string;
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}

@Table({
  tableName: 'sessions',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['refresh_token'], unique: true },
    { fields: ['device_id'] },
    { fields: ['expires_at'] },
  ],
})
export default class Session extends Model<SessionAttributes, SessionCreationAttributes> {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  userId!: string;

  @AllowNull(false)
  @Index
  @Column(DataType.STRING(255))
  deviceId!: string;

  @Column(DataType.STRING(255))
  deviceName?: string;

  @Column(DataType.STRING(50))
  deviceType?: string;

  @AllowNull(false)
  @Index({ unique: true })
  @Column(DataType.TEXT)
  refreshToken!: string;

  @Column(DataType.STRING(45))
  ipAddress?: string;

  @Column(DataType.TEXT)
  userAgent?: string;

  @AllowNull(false)
  @Index
  @Column(DataType.DATE)
  expiresAt!: Date;

  @Default(DataType.NOW)
  @Column(DataType.DATE)
  lastActiveAt!: Date;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  // Associations
  @BelongsTo(() => User)
  user?: User;

  // Instance methods
  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  public updateLastActive(): void {
    this.lastActiveAt = new Date();
  }

  public isValid(): boolean {
    return !this.isExpired();
  }

  public toSafeObject(): Partial<SessionAttributes> {
    return {
      id: this.id,
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      deviceType: this.deviceType,
      ipAddress: this.ipAddress,
      lastActiveAt: this.lastActiveAt,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
    };
  }
}
