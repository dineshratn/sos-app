"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MedicalProfile_1 = __importDefault(require("../models/MedicalProfile"));
const MedicalAllergy_1 = __importDefault(require("../models/MedicalAllergy"));
const MedicalMedication_1 = __importDefault(require("../models/MedicalMedication"));
const MedicalCondition_1 = __importDefault(require("../models/MedicalCondition"));
const MedicalAccessAudit_1 = __importStar(require("../models/MedicalAccessAudit"));
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = __importStar(require("../utils/logger"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
class MedicalService {
    /**
     * Log access to medical data for HIPAA compliance
     */
    async logAccess(medicalProfileId, accessedBy, role, reason, action, ipAddress, userAgent, emergencyId, dataAccessed) {
        try {
            await MedicalAccessAudit_1.default.create({
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
            logger_1.auditLogger.info('Medical data access logged', {
                medicalProfileId,
                accessedBy,
                role,
                reason,
                action,
                emergencyId,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error('Failed to log medical access:', error);
            // Don't throw - audit logging failure shouldn't block operations
        }
    }
    /**
     * Get or create medical profile for a user
     */
    async getOrCreateProfile(userId, accessInfo) {
        try {
            let profile = await MedicalProfile_1.default.findOne({
                where: { userId },
                include: [
                    { model: MedicalAllergy_1.default, as: 'allergies' },
                    { model: MedicalMedication_1.default, as: 'medications', where: { isActive: true }, required: false },
                    { model: MedicalCondition_1.default, as: 'conditions', where: { isActive: true }, required: false },
                ],
            });
            if (!profile) {
                profile = await MedicalProfile_1.default.create({ userId });
                logger_1.default.info(`Created medical profile for user: ${userId}`);
            }
            // Log access
            await this.logAccess(profile.id, accessInfo.accessedBy, accessInfo.role, accessInfo.reason, 'view_profile', accessInfo.ipAddress, accessInfo.userAgent);
            return profile;
        }
        catch (error) {
            logger_1.default.error('Error getting/creating medical profile:', error);
            throw new errorHandler_1.AppError('Failed to get medical profile', 500, 'GET_PROFILE_ERROR');
        }
    }
    /**
     * Update medical profile
     */
    async updateProfile(userId, updates, accessInfo) {
        try {
            const profile = await MedicalProfile_1.default.findOne({ where: { userId } });
            if (!profile) {
                throw new errorHandler_1.AppError('Medical profile not found', 404, 'PROFILE_NOT_FOUND');
            }
            // Update fields
            await profile.update(updates);
            // Mark as reviewed
            await profile.markAsReviewed();
            // Log access
            await this.logAccess(profile.id, accessInfo.accessedBy, accessInfo.role, MedicalAccessAudit_1.AccessReason.USER_REQUEST, 'update_profile', accessInfo.ipAddress, accessInfo.userAgent, undefined, Object.keys(updates));
            logger_1.default.info(`Updated medical profile: ${profile.id}`);
            return profile;
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError)
                throw error;
            logger_1.default.error('Error updating medical profile:', error);
            throw new errorHandler_1.AppError('Failed to update medical profile', 500, 'UPDATE_PROFILE_ERROR');
        }
    }
    /**
     * Get medical profile for emergency access
     */
    async getProfileForEmergency(userId, emergencyId, accessInfo) {
        try {
            const profile = await MedicalProfile_1.default.findOne({
                where: { userId },
                include: [
                    { model: MedicalAllergy_1.default, as: 'allergies' },
                    { model: MedicalMedication_1.default, as: 'medications', where: { isActive: true }, required: false },
                    { model: MedicalCondition_1.default, as: 'conditions', where: { isActive: true }, required: false },
                ],
            });
            if (!profile) {
                throw new errorHandler_1.AppError('Medical profile not found', 404, 'PROFILE_NOT_FOUND');
            }
            // Log emergency access
            await this.logAccess(profile.id, accessInfo.accessedBy, accessInfo.role, MedicalAccessAudit_1.AccessReason.EMERGENCY, 'view_emergency_profile', accessInfo.ipAddress, accessInfo.userAgent, emergencyId, ['all']);
            return profile.toEmergencyObject();
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError)
                throw error;
            logger_1.default.error('Error getting emergency profile:', error);
            throw new errorHandler_1.AppError('Failed to get emergency profile', 500, 'GET_EMERGENCY_PROFILE_ERROR');
        }
    }
    /**
     * Generate secure access link for first responders
     */
    async generateSecureAccessLink(userId, emergencyId, requesterRole) {
        try {
            const profile = await MedicalProfile_1.default.findOne({ where: { userId } });
            if (!profile) {
                throw new errorHandler_1.AppError('Medical profile not found', 404, 'PROFILE_NOT_FOUND');
            }
            // Generate JWT token with 1 hour expiry
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1);
            const token = jsonwebtoken_1.default.sign({
                profileId: profile.id,
                userId: profile.userId,
                emergencyId,
                requesterRole,
                type: 'emergency_access',
            }, config_1.default.auth.jwtSecret, {
                expiresIn: '1h',
            });
            logger_1.default.info(`Generated secure access link for emergency: ${emergencyId}`);
            return {
                token,
                expiresAt,
            };
        }
        catch (error) {
            logger_1.default.error('Error generating secure access link:', error);
            throw new errorHandler_1.AppError('Failed to generate access link', 500, 'GENERATE_LINK_ERROR');
        }
    }
    /**
     * Add allergy to medical profile
     */
    async addAllergy(userId, allergyData) {
        try {
            const profile = await MedicalProfile_1.default.findOne({ where: { userId } });
            if (!profile) {
                throw new errorHandler_1.AppError('Medical profile not found', 404, 'PROFILE_NOT_FOUND');
            }
            const allergy = await MedicalAllergy_1.default.create({
                medicalProfileId: profile.id,
                ...allergyData,
            });
            logger_1.default.info(`Added allergy to profile: ${profile.id}`);
            return allergy;
        }
        catch (error) {
            logger_1.default.error('Error adding allergy:', error);
            throw new errorHandler_1.AppError('Failed to add allergy', 500, 'ADD_ALLERGY_ERROR');
        }
    }
    /**
     * Add medication to medical profile
     */
    async addMedication(userId, medicationData) {
        try {
            const profile = await MedicalProfile_1.default.findOne({ where: { userId } });
            if (!profile) {
                throw new errorHandler_1.AppError('Medical profile not found', 404, 'PROFILE_NOT_FOUND');
            }
            const medication = await MedicalMedication_1.default.create({
                medicalProfileId: profile.id,
                ...medicationData,
            });
            logger_1.default.info(`Added medication to profile: ${profile.id}`);
            return medication;
        }
        catch (error) {
            logger_1.default.error('Error adding medication:', error);
            throw new errorHandler_1.AppError('Failed to add medication', 500, 'ADD_MEDICATION_ERROR');
        }
    }
    /**
     * Add medical condition to profile
     */
    async addCondition(userId, conditionData) {
        try {
            const profile = await MedicalProfile_1.default.findOne({ where: { userId } });
            if (!profile) {
                throw new errorHandler_1.AppError('Medical profile not found', 404, 'PROFILE_NOT_FOUND');
            }
            const condition = await MedicalCondition_1.default.create({
                medicalProfileId: profile.id,
                ...conditionData,
            });
            logger_1.default.info(`Added condition to profile: ${profile.id}`);
            return condition;
        }
        catch (error) {
            logger_1.default.error('Error adding condition:', error);
            throw new errorHandler_1.AppError('Failed to add condition', 500, 'ADD_CONDITION_ERROR');
        }
    }
    /**
     * Get audit log for a user's medical profile
     */
    async getAuditLog(userId, options) {
        try {
            const profile = await MedicalProfile_1.default.findOne({ where: { userId } });
            if (!profile) {
                throw new errorHandler_1.AppError('Medical profile not found', 404, 'PROFILE_NOT_FOUND');
            }
            const where = { medicalProfileId: profile.id };
            if (options?.startDate || options?.endDate) {
                where.timestamp = {};
                if (options.startDate) {
                    where.timestamp.$gte = options.startDate;
                }
                if (options.endDate) {
                    where.timestamp.$lte = options.endDate;
                }
            }
            const logs = await MedicalAccessAudit_1.default.findAll({
                where,
                order: [['timestamp', 'DESC']],
                limit: options?.limit || 50,
                offset: options?.offset || 0,
            });
            const total = await MedicalAccessAudit_1.default.count({ where });
            return { logs, total };
        }
        catch (error) {
            logger_1.default.error('Error fetching audit log:', error);
            throw new errorHandler_1.AppError('Failed to fetch audit log', 500, 'FETCH_AUDIT_ERROR');
        }
    }
}
exports.default = new MedicalService();
//# sourceMappingURL=medical.service.js.map