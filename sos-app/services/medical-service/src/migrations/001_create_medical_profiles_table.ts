import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('medical_profiles', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: 'Unique identifier for medical profile',
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        comment: 'Reference to user in auth service',
      },
      blood_type: {
        type: DataTypes.ENUM(
          'A+',
          'A-',
          'B+',
          'B-',
          'AB+',
          'AB-',
          'O+',
          'O-',
          'Unknown'
        ),
        allowNull: true,
        comment: 'Blood type (plaintext for emergency access)',
      },
      blood_type_encrypted: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Encrypted blood type backup (AES-256-GCM)',
      },
      organ_donor: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        comment: 'Organ donor status',
      },
      do_not_resuscitate: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        comment: 'Do not resuscitate (DNR) directive',
      },
      emergency_notes_encrypted: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Encrypted emergency medical notes (AES-256-GCM)',
      },
      primary_physician_encrypted: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Encrypted primary physician name (AES-256-GCM)',
      },
      primary_physician_phone_encrypted: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Encrypted primary physician phone (AES-256-GCM)',
      },
      insurance_provider_encrypted: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Encrypted insurance provider name (AES-256-GCM)',
      },
      insurance_policy_number_encrypted: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Encrypted insurance policy number (AES-256-GCM)',
      },
      last_reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last time user reviewed medical information',
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
        comment: 'Soft delete timestamp for HIPAA compliance',
      },
    });

    // Create indexes
    await queryInterface.addIndex('medical_profiles', ['user_id'], {
      unique: true,
      name: 'medical_profiles_user_id_idx',
    });

    await queryInterface.addIndex('medical_profiles', ['created_at'], {
      name: 'medical_profiles_created_at_idx',
    });

    await queryInterface.addIndex('medical_profiles', ['deleted_at'], {
      name: 'medical_profiles_deleted_at_idx',
    });

    await queryInterface.addIndex('medical_profiles', ['last_reviewed_at'], {
      name: 'medical_profiles_last_reviewed_at_idx',
      where: {
        deleted_at: null,
      },
    });

    // Add comment to table
    await queryInterface.sequelize.query(`
      COMMENT ON TABLE medical_profiles IS
      'HIPAA-compliant medical profiles with field-level encryption.
      Contains critical medical information for emergency situations.
      Encrypted fields use AES-256-GCM encryption.';
    `);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('medical_profiles');
  },
};
