"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        await queryInterface.createTable('medical_access_audit', {
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
                comment: 'Unique identifier for audit record',
            },
            medical_profile_id: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                comment: 'Reference to medical profile that was accessed',
            },
            accessed_by: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                comment: 'ID of user/system that accessed the data',
            },
            accessed_by_role: {
                type: sequelize_1.DataTypes.ENUM('user', 'emergency_contact', 'first_responder', 'physician', 'admin', 'system'),
                allowNull: false,
                comment: 'Role of the accessor',
            },
            reason: {
                type: sequelize_1.DataTypes.ENUM('emergency', 'routine_care', 'user_request', 'emergency_contact', 'first_responder', 'administrative', 'system'),
                allowNull: false,
                comment: 'Reason for accessing medical data',
            },
            action: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                comment: 'Action performed (view, update, delete, export, etc.)',
            },
            ip_address: {
                type: sequelize_1.DataTypes.INET,
                allowNull: true,
                comment: 'IP address of the accessor',
            },
            user_agent: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: 'User agent string from the request',
            },
            emergency_id: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: 'Emergency ID if access was during an emergency',
            },
            access_token: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
                comment: 'Hashed access token used (for verification)',
            },
            data_accessed: {
                type: sequelize_1.DataTypes.JSONB,
                allowNull: true,
                comment: 'List of specific data fields accessed',
            },
            timestamp: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
                comment: 'Timestamp of access (immutable)',
            },
        });
        // Create indexes for querying audit logs
        await queryInterface.addIndex('medical_access_audit', ['medical_profile_id'], {
            name: 'medical_access_audit_profile_id_idx',
        });
        await queryInterface.addIndex('medical_access_audit', ['accessed_by'], {
            name: 'medical_access_audit_accessed_by_idx',
        });
        await queryInterface.addIndex('medical_access_audit', ['timestamp'], {
            name: 'medical_access_audit_timestamp_idx',
        });
        await queryInterface.addIndex('medical_access_audit', ['reason'], {
            name: 'medical_access_audit_reason_idx',
        });
        await queryInterface.addIndex('medical_access_audit', ['emergency_id'], {
            name: 'medical_access_audit_emergency_id_idx',
            where: {
                emergency_id: {
                    [Symbol.for('ne')]: null,
                },
            },
        });
        // Composite index for user access history
        await queryInterface.addIndex('medical_access_audit', ['medical_profile_id', 'timestamp'], {
            name: 'medical_access_audit_profile_timestamp_idx',
        });
        // Composite index for emergency access tracking
        await queryInterface.addIndex('medical_access_audit', ['emergency_id', 'timestamp'], {
            name: 'medical_access_audit_emergency_timestamp_idx',
            where: {
                emergency_id: {
                    [Symbol.for('ne')]: null,
                },
            },
        });
        // Add table comment
        await queryInterface.sequelize.query(`
      COMMENT ON TABLE medical_access_audit IS
      'HIPAA-compliant audit log for all access to medical information.
      This table is append-only and immutable.
      Records must be retained for at least 6 years per HIPAA requirements.';
    `);
        // Make table immutable (prevent updates and deletes)
        // Note: This is PostgreSQL-specific. In production, use database roles/permissions
        await queryInterface.sequelize.query(`
      CREATE OR REPLACE RULE medical_access_audit_no_update AS
        ON UPDATE TO medical_access_audit
        DO INSTEAD NOTHING;
    `);
        await queryInterface.sequelize.query(`
      CREATE OR REPLACE RULE medical_access_audit_no_delete AS
        ON DELETE TO medical_access_audit
        DO INSTEAD NOTHING;
    `);
    },
    down: async (queryInterface) => {
        // Drop rules first
        await queryInterface.sequelize.query(`
      DROP RULE IF EXISTS medical_access_audit_no_update ON medical_access_audit;
    `);
        await queryInterface.sequelize.query(`
      DROP RULE IF EXISTS medical_access_audit_no_delete ON medical_access_audit;
    `);
        await queryInterface.dropTable('medical_access_audit');
    },
};
//# sourceMappingURL=005_create_medical_access_audit_table.js.map