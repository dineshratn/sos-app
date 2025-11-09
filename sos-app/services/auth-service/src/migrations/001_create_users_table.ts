import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Create users table
 *
 * This migration creates the users table for storing user authentication
 * and profile information. It includes support for local auth, OAuth providers,
 * MFA, and account security features.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('users', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Bcrypt hash of password (null for OAuth users)',
    },
    auth_provider: {
      type: DataTypes.ENUM('local', 'google', 'apple'),
      allowNull: false,
      defaultValue: 'local',
    },
    provider_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'ID from OAuth provider (Google, Apple)',
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    mfa_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    mfa_secret: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'TOTP secret for MFA (encrypted)',
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    phone_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    failed_login_attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Track failed login attempts for security',
    },
    account_locked_until: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Account locked until this timestamp after too many failed attempts',
    },
    password_reset_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Token for password reset flow',
    },
    password_reset_expires: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Expiration time for password reset token',
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
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Soft delete timestamp for GDPR compliance',
    },
  });

  // Create indexes for fast lookups
  await queryInterface.addIndex('users', ['email'], {
    name: 'idx_users_email',
    unique: true,
  });

  await queryInterface.addIndex('users', ['phone_number'], {
    name: 'idx_users_phone_number',
    unique: true,
    where: {
      phone_number: { $ne: null },
    },
  });

  await queryInterface.addIndex('users', ['auth_provider', 'provider_id'], {
    name: 'idx_users_auth_provider',
  });

  await queryInterface.addIndex('users', ['password_reset_token'], {
    name: 'idx_users_password_reset_token',
    where: {
      password_reset_token: { $ne: null },
    },
  });

  await queryInterface.addIndex('users', ['created_at'], {
    name: 'idx_users_created_at',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('users');
}
