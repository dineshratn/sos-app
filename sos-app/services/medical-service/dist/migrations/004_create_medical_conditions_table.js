"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        await queryInterface.createTable('medical_conditions', {
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
                comment: 'Unique identifier for medical condition record',
            },
            medical_profile_id: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'medical_profiles',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                comment: 'Reference to medical profile',
            },
            condition_name: {
                type: sequelize_1.DataTypes.STRING(200),
                allowNull: false,
                comment: 'Medical condition name (e.g., Diabetes, Hypertension)',
            },
            severity: {
                type: sequelize_1.DataTypes.ENUM('mild', 'moderate', 'severe', 'critical'),
                allowNull: true,
                comment: 'Severity of the condition',
            },
            diagnosed_date: {
                type: sequelize_1.DataTypes.DATEONLY,
                allowNull: true,
                comment: 'Date when condition was diagnosed',
            },
            is_chronic: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: 'Whether condition is chronic (long-term)',
            },
            is_active: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: 'Whether condition is currently active',
            },
            notes: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: 'Additional notes about the condition',
            },
            created_at: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
                comment: 'Record creation timestamp',
            },
            updated_at: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
                comment: 'Record last update timestamp',
            },
            deleted_at: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: 'Soft delete timestamp',
            },
        });
        // Create indexes
        await queryInterface.addIndex('medical_conditions', ['medical_profile_id'], {
            name: 'medical_conditions_profile_id_idx',
        });
        await queryInterface.addIndex('medical_conditions', ['severity'], {
            name: 'medical_conditions_severity_idx',
            where: {
                deleted_at: null,
            },
        });
        await queryInterface.addIndex('medical_conditions', ['is_chronic'], {
            name: 'medical_conditions_is_chronic_idx',
            where: {
                deleted_at: null,
            },
        });
        await queryInterface.addIndex('medical_conditions', ['is_active'], {
            name: 'medical_conditions_is_active_idx',
            where: {
                deleted_at: null,
            },
        });
        await queryInterface.addIndex('medical_conditions', ['created_at'], {
            name: 'medical_conditions_created_at_idx',
        });
        await queryInterface.addIndex('medical_conditions', ['deleted_at'], {
            name: 'medical_conditions_deleted_at_idx',
        });
        // Composite index for active chronic conditions
        await queryInterface.addIndex('medical_conditions', ['medical_profile_id', 'is_chronic', 'is_active'], {
            name: 'medical_conditions_profile_chronic_active_idx',
            where: {
                deleted_at: null,
            },
        });
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable('medical_conditions');
    },
};
//# sourceMappingURL=004_create_medical_conditions_table.js.map