import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Create user_profiles table
 *
 * This migration creates the user_profiles table for storing extended
 * user profile information including personal details, address, and preferences.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('user_profiles', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      comment: 'Foreign key to users table in auth-service database',
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date of birth for age calculation',
    },
    profile_picture_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL to profile picture stored in cloud storage',
    },
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'User phone number (can differ from auth service phone)',
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Street address',
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'State/Province',
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    postal_code: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    timezone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'UTC',
      comment: 'User timezone (e.g., America/New_York)',
    },
    language: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: 'en',
      comment: 'Preferred language code (ISO 639-1)',
    },
    notification_preferences: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'JSON object storing notification settings',
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
  await queryInterface.addIndex('user_profiles', ['user_id'], {
    name: 'idx_user_profiles_user_id',
    unique: true,
  });

  await queryInterface.addIndex('user_profiles', ['created_at'], {
    name: 'idx_user_profiles_created_at',
  });

  await queryInterface.addIndex('user_profiles', ['deleted_at'], {
    name: 'idx_user_profiles_deleted_at',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('user_profiles');
}
