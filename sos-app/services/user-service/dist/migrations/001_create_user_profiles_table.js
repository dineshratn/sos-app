"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
const sequelize_1 = require("sequelize");
/**
 * Migration: Create user_profiles table
 *
 * This migration creates the user_profiles table for storing extended
 * user profile information including personal details, address, and preferences.
 */
async function up(queryInterface) {
    await queryInterface.createTable('user_profiles', {
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false,
        },
        user_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
            unique: true,
            comment: 'Foreign key to users table in auth-service database',
        },
        first_name: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: true,
        },
        last_name: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: true,
        },
        date_of_birth: {
            type: sequelize_1.DataTypes.DATEONLY,
            allowNull: true,
            comment: 'Date of birth for age calculation',
        },
        profile_picture_url: {
            type: sequelize_1.DataTypes.STRING(500),
            allowNull: true,
            comment: 'URL to profile picture stored in cloud storage',
        },
        phone_number: {
            type: sequelize_1.DataTypes.STRING(20),
            allowNull: true,
            comment: 'User phone number (can differ from auth service phone)',
        },
        address: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
            comment: 'Street address',
        },
        city: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: true,
        },
        state: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: true,
            comment: 'State/Province',
        },
        country: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: true,
        },
        postal_code: {
            type: sequelize_1.DataTypes.STRING(20),
            allowNull: true,
        },
        timezone: {
            type: sequelize_1.DataTypes.STRING(50),
            allowNull: true,
            defaultValue: 'UTC',
            comment: 'User timezone (e.g., America/New_York)',
        },
        language: {
            type: sequelize_1.DataTypes.STRING(10),
            allowNull: true,
            defaultValue: 'en',
            comment: 'Preferred language code (ISO 639-1)',
        },
        notification_preferences: {
            type: sequelize_1.DataTypes.JSONB,
            allowNull: true,
            comment: 'JSON object storing notification settings',
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
async function down(queryInterface) {
    await queryInterface.dropTable('user_profiles');
}
//# sourceMappingURL=001_create_user_profiles_table.js.map