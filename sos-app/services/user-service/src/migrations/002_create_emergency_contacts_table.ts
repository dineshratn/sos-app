import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Create emergency_contacts table
 *
 * This migration creates the emergency_contacts table for storing emergency
 * contact information with priority levels and verification status.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('emergency_contacts', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Foreign key to users table in auth-service database',
    },
    user_profile_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'user_profiles',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Foreign key to user_profiles table',
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'Full name of emergency contact',
    },
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Phone number in international format',
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Email address for notifications',
    },
    relationship: {
      type: DataTypes.ENUM(
        'spouse',
        'parent',
        'child',
        'sibling',
        'friend',
        'coworker',
        'neighbor',
        'caregiver',
        'other'
      ),
      allowNull: false,
      comment: 'Relationship to user',
    },
    priority: {
      type: DataTypes.ENUM('primary', 'secondary', 'tertiary'),
      allowNull: false,
      defaultValue: 'primary',
      comment: 'Contact priority for emergency notifications',
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Contact full address',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes about the contact',
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether contact has verified their phone/email',
    },
    last_notified_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time contact was notified about an emergency',
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
      comment: 'Soft delete timestamp',
    },
  });

  // Create indexes for fast lookups
  await queryInterface.addIndex('emergency_contacts', ['user_id'], {
    name: 'idx_emergency_contacts_user_id',
  });

  await queryInterface.addIndex('emergency_contacts', ['user_profile_id'], {
    name: 'idx_emergency_contacts_user_profile_id',
  });

  await queryInterface.addIndex('emergency_contacts', ['user_id', 'priority'], {
    name: 'idx_emergency_contacts_user_priority',
  });

  await queryInterface.addIndex('emergency_contacts', ['phone_number'], {
    name: 'idx_emergency_contacts_phone_number',
  });

  await queryInterface.addIndex('emergency_contacts', ['created_at'], {
    name: 'idx_emergency_contacts_created_at',
  });

  await queryInterface.addIndex('emergency_contacts', ['deleted_at'], {
    name: 'idx_emergency_contacts_deleted_at',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('emergency_contacts');
}
