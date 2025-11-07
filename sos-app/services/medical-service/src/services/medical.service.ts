import MedicalProfile, { BloodType } from '../models/MedicalProfile';
import MedicalAllergy, { AllergySeverity } from '../models/MedicalAllergy';
import MedicalMedication from '../models/MedicalMedication';
import MedicalCondition, { ConditionSeverity } from '../models/MedicalCondition';
import MedicalAccessAudit, { AccessRole, AccessReason } from '../models/MedicalAccessAudit';
import { AppError } from '../middleware/errorHandler';
import logger, { auditLogger } from '../utils/logger';
import { hashData } from '../utils/encryption';
import jwt from 'jsonwebtoken';
import config from '../config';

export interface UpdateMedicalProfileDTO {
  bloodType?: BloodType;
  organDonor?: boolean;
  doNotResuscitate?: boolean;
  emergencyNotes?: string;
  primaryPhysician?: string;
  primaryPhysicianPhone?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
}

export interface CreateAllergyDTO {
  allergen: string;
  severity: AllergySeverity;
  reaction?: string;
  diagnosedDate?: string;
  notes?: string;
}

export interface CreateMedicationDTO {
  medicationName: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  prescribedBy?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface CreateConditionDTO {
  conditionName: string;
  severity?: ConditionSeverity;
  diagnosedDate?: string;
  isChronic?: boolean;
  notes?: string;
}

class MedicalService {
  /**
   * Log access to medical data for HIPAA compliance
   */
  private async logAccess(
    medicalProfileId: string,
    accessedBy: string,
    role: AccessRole,
    reason: AccessReason,
    action: string,
    ipAddress?: string,
    userAgent?: string,
    emergencyId?: string,
    dataAccessed?: string[]
  ): Promise<void> {
    try {
      await MedicalAccessAudit.create({
        medicalProfileId,
        accessedBy,
        accessedByRole: role,
        reason,
        action,
        ipAddress,
        userAgent,
        emergencyId,
        dataAccessed,
      });

      auditLogger.info('Medical data access logged', {
        medicalProfileId,
        accessedBy,
        role,
        reason,
        action,
        emergencyId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to log medical access:', error);
      // Don't throw - audit logging failure shouldn't block operations
    }
  }

  /**
   * Get or create medical profile for a user
   */
  public async getOrCreateProfile(
    userId: string,
    accessInfo: {
      accessedBy: string;
      role: AccessRole;
      reason: AccessReason;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<MedicalProfile> {
    try {
      let profile = await MedicalProfile.findOne({
        where: { userId },
        include: [
          { model: MedicalAllergy, as: 'allergies' },
          { model: MedicalMedication, as: 'medications', where: { isActive: true }, required: false },
          { model: MedicalCondition, as: 'conditions', where: { isActive: true }, required: false },
        ],
      });

      if (!profile) {
        profile = await MedicalProfile.create({ userId });
        logger.info(`Created medical profile for user: ${userId}`);
      }

      // Log access
      await this.logAccess(
        profile.id,
        accessInfo.accessedBy,
        accessInfo.role,
        accessInfo.reason,
        'view_profile',
        accessInfo.ipAddress,
        accessInfo.userAgent
      );

      return profile;
    } catch (error) {
      logger.error('Error getting/creating medical profile:', error);
      throw new AppError('Failed to get medical profile', 500, 'GET_PROFILE_ERROR');
    }
  }

  /**
   * Update medical profile
   */
  public async updateProfile(
    userId: string,
    updates: UpdateMedicalProfileDTO,
    accessInfo: {
      accessedBy: string;
      role: AccessRole;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<MedicalProfile> {
    try {
      const profile = await MedicalProfile.findOne({ where: { userId } });

      if (!profile) {
        throw new AppError('Medical profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      // Update fields
      await profile.update(updates);

      // Mark as reviewed
      await profile.markAsReviewed();

      // Log access
      await this.logAccess(
        profile.id,
        accessInfo.accessedBy,
        accessInfo.role,
        AccessReason.USER_REQUEST,
        'update_profile',
        accessInfo.ipAddress,
        accessInfo.userAgent,
        undefined,
        Object.keys(updates)
      );

      logger.info(`Updated medical profile: ${profile.id}`);
      return profile;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating medical profile:', error);
      throw new AppError('Failed to update medical profile', 500, 'UPDATE_PROFILE_ERROR');
    }
  }

  /**
   * Get medical profile for emergency access
   */
  public async getProfileForEmergency(
    userId: string,
    emergencyId: string,
    accessInfo: {
      accessedBy: string;
      role: AccessRole;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<any> {
    try {
      const profile = await MedicalProfile.findOne({
        where: { userId },
        include: [
          { model: MedicalAllergy, as: 'allergies' },
          { model: MedicalMedication, as: 'medications', where: { isActive: true }, required: false },
          { model: MedicalCondition, as: 'conditions', where: { isActive: true }, required: false },
        ],
      });

      if (!profile) {
        throw new AppError('Medical profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      // Log emergency access
      await this.logAccess(
        profile.id,
        accessInfo.accessedBy,
        accessInfo.role,
        AccessReason.EMERGENCY,
        'view_emergency_profile',
        accessInfo.ipAddress,
        accessInfo.userAgent,
        emergencyId,
        ['all']
      );

      return profile.toEmergencyObject();
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting emergency profile:', error);
      throw new AppError('Failed to get emergency profile', 500, 'GET_EMERGENCY_PROFILE_ERROR');
    }
  }

  /**
   * Generate secure access link for first responders
   */
  public async generateSecureAccessLink(
    userId: string,
    emergencyId: string,
    requesterRole: AccessRole
  ): Promise<{ token: string; expiresAt: Date }> {
    try {
      const profile = await MedicalProfile.findOne({ where: { userId } });

      if (!profile) {
        throw new AppError('Medical profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      // Generate JWT token with 1 hour expiry
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const token = jwt.sign(
        {
          profileId: profile.id,
          userId: profile.userId,
          emergencyId,
          requesterRole,
          type: 'emergency_access',
        },
        config.auth.jwtSecret,
        {
          expiresIn: '1h',
        }
      );

      logger.info(`Generated secure access link for emergency: ${emergencyId}`);

      return {
        token,
        expiresAt,
      };
    } catch (error) {
      logger.error('Error generating secure access link:', error);
      throw new AppError('Failed to generate access link', 500, 'GENERATE_LINK_ERROR');
    }
  }

  /**
   * Add allergy to medical profile
   */
  public async addAllergy(
    userId: string,
    allergyData: CreateAllergyDTO
  ): Promise<MedicalAllergy> {
    try {
      const profile = await MedicalProfile.findOne({ where: { userId } });

      if (!profile) {
        throw new AppError('Medical profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      const allergy = await MedicalAllergy.create({
        medicalProfileId: profile.id,
        ...allergyData,
      });

      logger.info(`Added allergy to profile: ${profile.id}`);
      return allergy;
    } catch (error) {
      logger.error('Error adding allergy:', error);
      throw new AppError('Failed to add allergy', 500, 'ADD_ALLERGY_ERROR');
    }
  }

  /**
   * Add medication to medical profile
   */
  public async addMedication(
    userId: string,
    medicationData: CreateMedicationDTO
  ): Promise<MedicalMedication> {
    try {
      const profile = await MedicalProfile.findOne({ where: { userId } });

      if (!profile) {
        throw new AppError('Medical profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      const medication = await MedicalMedication.create({
        medicalProfileId: profile.id,
        ...medicationData,
      });

      logger.info(`Added medication to profile: ${profile.id}`);
      return medication;
    } catch (error) {
      logger.error('Error adding medication:', error);
      throw new AppError('Failed to add medication', 500, 'ADD_MEDICATION_ERROR');
    }
  }

  /**
   * Add medical condition to profile
   */
  public async addCondition(
    userId: string,
    conditionData: CreateConditionDTO
  ): Promise<MedicalCondition> {
    try {
      const profile = await MedicalProfile.findOne({ where: { userId } });

      if (!profile) {
        throw new AppError('Medical profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      const condition = await MedicalCondition.create({
        medicalProfileId: profile.id,
        ...conditionData,
      });

      logger.info(`Added condition to profile: ${profile.id}`);
      return condition;
    } catch (error) {
      logger.error('Error adding condition:', error);
      throw new AppError('Failed to add condition', 500, 'ADD_CONDITION_ERROR');
    }
  }

  /**
   * Get audit log for a user's medical profile
   */
  public async getAuditLog(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ logs: MedicalAccessAudit[]; total: number }> {
    try {
      const profile = await MedicalProfile.findOne({ where: { userId } });

      if (!profile) {
        throw new AppError('Medical profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      const where: any = { medicalProfileId: profile.id };

      if (options?.startDate || options?.endDate) {
        where.timestamp = {};
        if (options.startDate) {
          where.timestamp.$gte = options.startDate;
        }
        if (options.endDate) {
          where.timestamp.$lte = options.endDate;
        }
      }

      const logs = await MedicalAccessAudit.findAll({
        where,
        order: [['timestamp', 'DESC']],
        limit: options?.limit || 50,
        offset: options?.offset || 0,
      });

      const total = await MedicalAccessAudit.count({ where });

      return { logs, total };
    } catch (error) {
      logger.error('Error fetching audit log:', error);
      throw new AppError('Failed to fetch audit log', 500, 'FETCH_AUDIT_ERROR');
    }
  }
}

export default new MedicalService();
