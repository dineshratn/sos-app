"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
const sequelize_1 = require("sequelize");
/**
 * Migration: Create emergency_contacts table
 *
 * This migration creates the emergency_contacts table for storing emergency
 * contact information with priority levels and verification status.
 */
async function up(queryInterface) {
    await queryInterface.createTable('emergency_contacts', {
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false,
        },
        user_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
            comment: 'Foreign key to users table in auth-service database',
        },
        user_profile_id: {
            type: sequelize_1.DataTypes.UUID,
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
            type: sequelize_1.DataTypes.STRING(200),
            allowNull: false,
            comment: 'Full name of emergency contact',
        },
        phone_number: {
            type: sequelize_1.DataTypes.STRING(20),
            allowNull: false,
            comment: 'Phone number in international format',
        },
        email: {
            type: sequelize_1.DataTypes.STRING(255),
            allowNull: true,
            comment: 'Email address for notifications',
        },
        relationship: {
            type: sequelize_1.DataTypes.ENUM('spouse', 'parent', 'child', 'sibling', 'friend', 'coworker', 'neighbor', 'caregiver', 'other'),
            allowNull: false,
            comment: 'Relationship to user',
        },
        priority: {
            type: sequelize_1.DataTypes.ENUM('primary', 'secondary', 'tertiary'),
            allowNull: false,
            defaultValue: 'primary',
            comment: 'Contact priority for emergency notifications',
        },
        address: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
            comment: 'Contact full address',
        },
        notes: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
            comment: 'Additional notes about the contact',
        },
        is_verified: {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Whether contact has verified their phone/email',
        },
        last_notified_at: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: true,
            comment: 'Last time contact was notified about an emergency',
        },
        created_at: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize_1.DataTypes.NOW,
        },
        updated_at: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize_1.DataTypes.NOW,
        },
        deleted_at: {
            type: sequelize_1.DataTypes.DATE,
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
async function down(queryInterface) {
    await queryInterface.dropTable('emergency_contacts');
}
//# sourceMappingURL=002_create_emergency_contacts_table.js.map