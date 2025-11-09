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
  declare id: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare userId: string;

  @AllowNull(false)
  @Index
  @Column(DataType.STRING(255))
  declare deviceId: string;

  @Column(DataType.STRING(255))
  declare deviceName?: string;

  @Column(DataType.STRING(50))
  declare deviceType?: string;

  @AllowNull(false)
  @Index({ unique: true })
  @Column(DataType.TEXT)
  declare refreshToken: string;

  @Column(DataType.STRING(45))
  declare ipAddress?: string;

  @Column(DataType.TEXT)
  declare userAgent?: string;

  @AllowNull(false)
  @Index
  @Column(DataType.DATE)
  declare expiresAt: Date;

  @Default(DataType.NOW)
  @Column(DataType.DATE)
  declare lastActiveAt: Date;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

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
