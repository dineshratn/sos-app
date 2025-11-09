"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BloodType = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const encryption_1 = require("../utils/encryption");
const MedicalAllergy_1 = __importDefault(require("./MedicalAllergy"));
const MedicalMedication_1 = __importDefault(require("./MedicalMedication"));
const MedicalCondition_1 = __importDefault(require("./MedicalCondition"));
var BloodType;
(function (BloodType) {
    BloodType["A_POSITIVE"] = "A+";
    BloodType["A_NEGATIVE"] = "A-";
    BloodType["B_POSITIVE"] = "B+";
    BloodType["B_NEGATIVE"] = "B-";
    BloodType["AB_POSITIVE"] = "AB+";
    BloodType["AB_NEGATIVE"] = "AB-";
    BloodType["O_POSITIVE"] = "O+";
    BloodType["O_NEGATIVE"] = "O-";
    BloodType["UNKNOWN"] = "Unknown";
})(BloodType || (exports.BloodType = BloodType = {}));
let MedicalProfile = class MedicalProfile extends sequelize_typescript_1.Model {
    // Virtual fields for decrypted data
    get emergencyNotes() {
        return (0, encryption_1.decrypt)(this.emergencyNotesEncrypted);
    }
    set emergencyNotes(value) {
        this.emergencyNotesEncrypted = (0, encryption_1.encrypt)(value) || undefined;
    }
    get primaryPhysician() {
        return (0, encryption_1.decrypt)(this.primaryPhysicianEncrypted);
    }
    set primaryPhysician(value) {
        this.primaryPhysicianEncrypted = (0, encryption_1.encrypt)(value) || undefined;
    }
    get primaryPhysicianPhone() {
        return (0, encryption_1.decrypt)(this.primaryPhysicianPhoneEncrypted);
    }
    set primaryPhysicianPhone(value) {
        this.primaryPhysicianPhoneEncrypted = (0, encryption_1.encrypt)(value) || undefined;
    }
    get insuranceProvider() {
        return (0, encryption_1.decrypt)(this.insuranceProviderEncrypted);
    }
    set insuranceProvider(value) {
        this.insuranceProviderEncrypted = (0, encryption_1.encrypt)(value) || undefined;
    }
    get insurancePolicyNumber() {
        return (0, encryption_1.decrypt)(this.insurancePolicyNumberEncrypted);
    }
    set insurancePolicyNumber(value) {
        this.insurancePolicyNumberEncrypted = (0, encryption_1.encrypt)(value) || undefined;
    }
    /**
     * Check if profile needs review (older than 6 months)
     */
    needsReview() {
        if (!this.lastReviewedAt) {
            return true;
        }
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return this.lastReviewedAt < sixMonthsAgo;
    }
    /**
     * Mark profile as reviewed
     */
    async markAsReviewed() {
        this.lastReviewedAt = new Date();
        await this.save();
    }
    /**
     * Get safe object for API response (excludes encrypted fields)
     */
    toSafeObject() {
        return {
            id: this.id,
            userId: this.userId,
            bloodType: this.bloodType,
            organDonor: this.organDonor,
            doNotResuscitate: this.doNotResuscitate,
            emergencyNotes: this.emergencyNotes,
            primaryPhysician: this.primaryPhysician,
            primaryPhysicianPhone: this.primaryPhysicianPhone,
            insuranceProvider: this.insuranceProvider,
            insurancePolicyNumber: this.insurancePolicyNumber,
            lastReviewedAt: this.lastReviewedAt,
            needsReview: this.needsReview(),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
    /**
     * Get minimal emergency object (for first responders)
     * Only includes critical, life-saving information
     */
    toEmergencyObject() {
        return {
            bloodType: this.bloodType,
            organDonor: this.organDonor,
            doNotResuscitate: this.doNotResuscitate,
            emergencyNotes: this.emergencyNotes,
            allergies: this.allergies?.map((a) => a.toSafeObject()) || [],
            medications: this.medications?.map((m) => m.toSafeObject()) || [],
            conditions: this.conditions?.map((c) => c.toSafeObject()) || [],
        };
    }
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    (0, sequelize_typescript_1.Default)(sequelize_typescript_1.DataType.UUIDV4),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID),
    __metadata("design:type", String)
], MedicalProfile.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        allowNull: false,
        unique: true,
        comment: 'Reference to user in auth service',
    }),
    __metadata("design:type", String)
], MedicalProfile.prototype, "userId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM(...Object.values(BloodType)),
        allowNull: true,
        comment: 'Blood type (stored in plaintext for quick emergency access)',
    }),
    __metadata("design:type", String)
], MedicalProfile.prototype, "bloodType", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.TEXT,
        allowNull: true,
        field: 'blood_type_encrypted',
        comment: 'Encrypted blood type backup',
    }),
    __metadata("design:type", String)
], MedicalProfile.prototype, "bloodTypeEncrypted", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        comment: 'Organ donor status',
    }),
    __metadata("design:type", Boolean)
], MedicalProfile.prototype, "organDonor", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        comment: 'Do not resuscitate (DNR) directive',
    }),
    __metadata("design:type", Boolean)
], MedicalProfile.prototype, "doNotResuscitate", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.TEXT,
        allowNull: true,
        field: 'emergency_notes_encrypted',
        comment: 'Encrypted emergency medical notes',
    }),
    __metadata("design:type", String)
], MedicalProfile.prototype, "emergencyNotesEncrypted", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.TEXT,
        allowNull: true,
        field: 'primary_physician_encrypted',
        comment: 'Encrypted primary physician name',
    }),
    __metadata("design:type", String)
], MedicalProfile.prototype, "primaryPhysicianEncrypted", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.TEXT,
        allowNull: true,
        field: 'primary_physician_phone_encrypted',
        comment: 'Encrypted primary physician phone number',
    }),
    __metadata("design:type", String)
], MedicalProfile.prototype, "primaryPhysicianPhoneEncrypted", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.TEXT,
        allowNull: true,
        field: 'insurance_provider_encrypted',
        comment: 'Encrypted insurance provider name',
    }),
    __metadata("design:type", String)
], MedicalProfile.prototype, "insuranceProviderEncrypted", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.TEXT,
        allowNull: true,
        field: 'insurance_policy_number_encrypted',
        comment: 'Encrypted insurance policy number',
    }),
    __metadata("design:type", String)
], MedicalProfile.prototype, "insurancePolicyNumberEncrypted", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.DATE,
        allowNull: true,
        comment: 'Last time user reviewed and confirmed their medical information',
    }),
    __metadata("design:type", Date)
], MedicalProfile.prototype, "lastReviewedAt", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE),
    __metadata("design:type", Date)
], MedicalProfile.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE),
    __metadata("design:type", Date)
], MedicalProfile.prototype, "updatedAt", void 0);
__decorate([
    sequelize_typescript_1.DeletedAt,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE),
    __metadata("design:type", Date)
], MedicalProfile.prototype, "deletedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => MedicalAllergy_1.default, {
        foreignKey: 'medicalProfileId',
        onDelete: 'CASCADE',
    }),
    __metadata("design:type", Array)
], MedicalProfile.prototype, "allergies", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => MedicalMedication_1.default, {
        foreignKey: 'medicalProfileId',
        onDelete: 'CASCADE',
    }),
    __metadata("design:type", Array)
], MedicalProfile.prototype, "medications", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => MedicalCondition_1.default, {
        foreignKey: 'medicalProfileId',
        onDelete: 'CASCADE',
    }),
    __metadata("design:type", Array)
], MedicalProfile.prototype, "conditions", void 0);
MedicalProfile = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: 'medical_profiles',
        timestamps: true,
        paranoid: true, // Soft delete for HIPAA compliance
    })
], MedicalProfile);
exports.default = MedicalProfile;
//# sourceMappingURL=MedicalProfile.js.map