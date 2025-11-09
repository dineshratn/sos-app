import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('medical_medications', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: 'Unique identifier for medication record',
      },
      medical_profile_id: {
        type: DataTypes.UUID,
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
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Medication name (brand or generic)',
      },
      dosage: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Dosage amount (e.g., 10mg, 500mg)',
      },
      frequency: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Frequency of administration (e.g., twice daily, as needed)',
      },
      route: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Route of administration (oral, injection, topical, etc.)',
      },
      prescribed_by: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Name of prescribing physician',
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Date when medication was started',
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Date when medication was discontinued',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether medication is currently active',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Additional notes about the medication',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Record creation timestamp',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Record last update timestamp',
      },
      deleted_at: {
        type: DataTypes.DATE,
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
    await queryInterface.addIndex(
      'medical_medications',
      ['medical_profile_id', 'is_active'],
      {
        name: 'medical_medications_profile_active_idx',
        where: {
          deleted_at: null,
        },
      }
    );
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('medical_medications');
  },
};
