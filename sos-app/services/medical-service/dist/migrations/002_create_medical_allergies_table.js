"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        await queryInterface.createTable('medical_allergies', {
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
                comment: 'Unique identifier for medical allergy record',
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
            allergen: {
                type: sequelize_1.DataTypes.STRING(200),
                allowNull: false,
                comment: 'Allergen name (e.g., Penicillin, Peanuts, Latex)',
            },
            severity: {
                type: sequelize_1.DataTypes.ENUM('mild', 'moderate', 'severe', 'life_threatening'),
                allowNull: false,
                comment: 'Severity of allergic reaction',
            },
            reaction: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
                comment: 'Description of allergic reaction symptoms',
            },
            diagnosed_date: {
                type: sequelize_1.DataTypes.DATEONLY,
                allowNull: true,
                comment: 'Date when allergy was diagnosed',
            },
            notes: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: 'Additional notes about the allergy',
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
        await queryInterface.addIndex('medical_allergies', ['medical_profile_id'], {
            name: 'medical_allergies_profile_id_idx',
        });
        await queryInterface.addIndex('medical_allergies', ['severity'], {
            name: 'medical_allergies_severity_idx',
            where: {
                deleted_at: null,
            },
        });
        await queryInterface.addIndex('medical_allergies', ['created_at'], {
            name: 'medical_allergies_created_at_idx',
        });
        await queryInterface.addIndex('medical_allergies', ['deleted_at'], {
            name: 'medical_allergies_deleted_at_idx',
        });
        // Composite index for quick emergency lookups
        await queryInterface.addIndex('medical_allergies', ['medical_profile_id', 'severity'], {
            name: 'medical_allergies_profile_severity_idx',
            where: {
                deleted_at: null,
            },
        });
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable('medical_allergies');
    },
};
//# sourceMappingURL=002_create_medical_allergies_table.js.map