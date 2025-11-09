"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        await queryInterface.createTable('medical_medications', {
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
                comment: 'Unique identifier for medication record',
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
            medication_name: {
                type: sequelize_1.DataTypes.STRING(200),
                allowNull: false,
                comment: 'Medication name (brand or generic)',
            },
            dosage: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true,
                comment: 'Dosage amount (e.g., 10mg, 500mg)',
            },
            frequency: {
                type: sequelize_1.DataTypes.STRING(200),
                allowNull: true,
                comment: 'Frequency of administration (e.g., twice daily, as needed)',
            },
            route: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
                comment: 'Route of administration (oral, injection, topical, etc.)',
            },
            prescribed_by: {
                type: sequelize_1.DataTypes.STRING(200),
                allowNull: true,
                comment: 'Name of prescribing physician',
            },
            start_date: {
                type: sequelize_1.DataTypes.DATEONLY,
                allowNull: true,
                comment: 'Date when medication was started',
            },
            end_date: {
                type: sequelize_1.DataTypes.DATEONLY,
                allowNull: true,
                comment: 'Date when medication was discontinued',
            },
            is_active: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: 'Whether medication is currently active',
            },
            notes: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: 'Additional notes about the medication',
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
        await queryInterface.addIndex('medical_medications', ['medical_profile_id'], {
            name: 'medical_medications_profile_id_idx',
        });
        await queryInterface.addIndex('medical_medications', ['is_active'], {
            name: 'medical_medications_is_active_idx',
            where: {
                deleted_at: null,
            },
        });
        await queryInterface.addIndex('medical_medications', ['start_date'], {
            name: 'medical_medications_start_date_idx',
        });
        await queryInterface.addIndex('medical_medications', ['created_at'], {
            name: 'medical_medications_created_at_idx',
        });
        await queryInterface.addIndex('medical_medications', ['deleted_at'], {
            name: 'medical_medications_deleted_at_idx',
        });
        // Composite index for active medications
        await queryInterface.addIndex('medical_medications', ['medical_profile_id', 'is_active'], {
            name: 'medical_medications_profile_active_idx',
            where: {
                deleted_at: null,
            },
        });
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable('medical_medications');
    },
};
//# sourceMappingURL=003_create_medical_medications_table.js.map