import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('medical_allergies', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: 'Unique identifier for medical allergy record',
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
      allergen: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Allergen name (e.g., Penicillin, Peanuts, Latex)',
      },
      severity: {
        type: DataTypes.ENUM('mild', 'moderate', 'severe', 'life_threatening'),
        allowNull: false,
        comment: 'Severity of allergic reaction',
      },
      reaction: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Description of allergic reaction symptoms',
      },
      diagnosed_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Date when allergy was diagnosed',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Additional notes about the allergy',
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
    await queryInterface.addIndex(
      'medical_allergies',
      ['medical_profile_id', 'severity'],
      {
        name: 'medical_allergies_profile_severity_idx',
        where: {
          deleted_at: null,
        },
      }
    );
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('medical_allergies');
  },
};
