import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Create sessions table
 *
 * This migration creates the sessions table for tracking user authentication
 * sessions, refresh tokens, and device information for multi-device support.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('sessions', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Foreign key to users table',
    },
    refresh_token: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true,
      comment: 'JWT refresh token for session',
    },
    device_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Unique device identifier',
    },
    device_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'User-friendly device name',
    },
    device_type: {
      type: DataTypes.ENUM('web', 'ios', 'android', 'desktop', 'unknown'),
      allowNull: false,
      defaultValue: 'unknown',
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP address of session creation (supports IPv6)',
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Browser/app user agent string',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Is session currently active',
    },
    last_active_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Last time session was used',
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'When the refresh token expires',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Create indexes for fast lookups
  await queryInterface.addIndex('sessions', ['user_id'], {
    name: 'idx_sessions_user_id',
  });

  await queryInterface.addIndex('sessions', ['refresh_token'], {
    name: 'idx_sessions_refresh_token',
    unique: true,
  });

  await queryInterface.addIndex('sessions', ['user_id', 'is_active'], {
    name: 'idx_sessions_user_active',
  });

  await queryInterface.addIndex('sessions', ['expires_at'], {
    name: 'idx_sessions_expires_at',
  });

  await queryInterface.addIndex('sessions', ['device_id'], {
    name: 'idx_sessions_device_id',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('sessions');
}
