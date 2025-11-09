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
const sequelize_typescript_1 = require("sequelize-typescript");
const MedicalProfile_1 = __importDefault(require("./MedicalProfile"));
let MedicalMedication = class MedicalMedication extends sequelize_typescript_1.Model {
    /**
     * Get safe object for API response
     */
    toSafeObject() {
        return {
            id: this.id,
            medicationName: this.medicationName,
            dosage: this.dosage,
            frequency: this.frequency,
            route: this.route,
            prescribedBy: this.prescribedBy,
            startDate: this.startDate,
            endDate: this.endDate,
            isActive: this.isActive,
            notes: this.notes,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
    /**
     * Mark medication as discontinued
     */
    async discontinue(endDate) {
        this.isActive = false;
        this.endDate = endDate || new Date();
        await this.save();
    }
    /**
     * Reactivate medication
     */
    async reactivate() {
        this.isActive = true;
        this.endDate = undefined;
        await this.save();
    }
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    (0, sequelize_typescript_1.Default)(sequelize_typescript_1.DataType.UUIDV4),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID),
    __metadata("design:type", String)
], MedicalMedication.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => MedicalProfile_1.default),
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        allowNull: false,
        comment: 'Reference to medical profile',
    }),
    __metadata("design:type", String)
], MedicalMedication.prototype, "medicalProfileId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING(200),
        allowNull: false,
        comment: 'Medication name',
    }),
    __metadata("design:type", String)
], MedicalMedication.prototype, "medicationName", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING(100),
        allowNull: true,
        comment: 'Dosage (e.g., 10mg, 500mg)',
    }),
    __metadata("design:type", String)
], MedicalMedication.prototype, "dosage", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING(200),
        allowNull: true,
        comment: 'Frequency (e.g., twice daily, as needed)',
    }),
    __metadata("design:type", String)
], MedicalMedication.prototype, "frequency", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING(50),
        allowNull: true,
        comment: 'Route of administration (oral, injection, topical, etc.)',
    }),
    __metadata("design:type", String)
], MedicalMedication.prototype, "route", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING(200),
        allowNull: true,
        comment: 'Prescribing physician name',
    }),
    __metadata("design:type", String)
], MedicalMedication.prototype, "prescribedBy", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.DATEONLY,
        allowNull: true,
        comment: 'Date when medication was started',
    }),
    __metadata("design:type", Date)
], MedicalMedication.prototype, "startDate", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.DATEONLY,
        allowNull: true,
        comment: 'Date when medication was discontinued',
    }),
    __metadata("design:type", Date)
], MedicalMedication.prototype, "endDate", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether medication is currently active',
    }),
    __metadata("design:type", Boolean)
], MedicalMedication.prototype, "isActive", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.TEXT,
        allowNull: true,
        comment: 'Additional notes about the medication',
    }),
    __metadata("design:type", String)
], MedicalMedication.prototype, "notes", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE),
    __metadata("design:type", Date)
], MedicalMedication.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE),
    __metadata("design:type", Date)
], MedicalMedication.prototype, "updatedAt", void 0);
__decorate([
    sequelize_typescript_1.DeletedAt,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE),
    __metadata("design:type", Date)
], MedicalMedication.prototype, "deletedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => MedicalProfile_1.default),
    __metadata("design:type", MedicalProfile_1.default)
], MedicalMedication.prototype, "medicalProfile", void 0);
MedicalMedication = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: 'medical_medications',
        timestamps: true,
        paranoid: true,
    })
], MedicalMedication);
exports.default = MedicalMedication;
//# sourceMappingURL=MedicalMedication.js.map