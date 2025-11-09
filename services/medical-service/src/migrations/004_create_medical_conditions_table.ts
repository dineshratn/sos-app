import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('medical_conditions', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: 'Unique identifier for medical condition record',
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
      condition_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Medical condition name (e.g., Diabetes, Hypertension)',
      },
      severity: {
        type: DataTypes.ENUM('mild', 'moderate', 'severe', 'critical'),
        allowNull: true,
        comment: 'Severity of the condition',
      },
      diagnosed_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Date when condition was diagnosed',
      },
      is_chronic: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether condition is chronic (long-term)',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether condition is currently active',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Additional notes about the condition',
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
    await queryInterface.addIndex(
      'medical_conditions',
      ['medical_profile_id', 'is_chronic', 'is_active'],
      {
        name: 'medical_conditions_profile_chronic_active_idx',
        where: {
          deleted_at: null,
        },
      }
    );
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('medical_conditions');
  },
};
