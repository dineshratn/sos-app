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
exports.ConditionSeverity = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const MedicalProfile_1 = __importDefault(require("./MedicalProfile"));
var ConditionSeverity;
(function (ConditionSeverity) {
    ConditionSeverity["MILD"] = "mild";
    ConditionSeverity["MODERATE"] = "moderate";
    ConditionSeverity["SEVERE"] = "severe";
    ConditionSeverity["CRITICAL"] = "critical";
})(ConditionSeverity || (exports.ConditionSeverity = ConditionSeverity = {}));
let MedicalCondition = class MedicalCondition extends sequelize_typescript_1.Model {
    /**
     * Get safe object for API response
     */
    toSafeObject() {
        return {
            id: this.id,
            conditionName: this.conditionName,
            severity: this.severity,
            diagnosedDate: this.diagnosedDate,
            isChronic: this.isChronic,
            isActive: this.isActive,
            notes: this.notes,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
    /**
     * Check if condition is critical
     */
    isCriticalCondition() {
        return (this.severity === ConditionSeverity.SEVERE ||
            this.severity === ConditionSeverity.CRITICAL);
    }
    /**
     * Mark condition as resolved
     */
    async resolve() {
        this.isActive = false;
        await this.save();
    }
    /**
     * Reactivate condition
     */
    async reactivate() {
        this.isActive = true;
        await this.save();
    }
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    (0, sequelize_typescript_1.Default)(sequelize_typescript_1.DataType.UUIDV4),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID),
    __metadata("design:type", String)
], MedicalCondition.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => MedicalProfile_1.default),
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        allowNull: false,
        comment: 'Reference to medical profile',
    }),
    __metadata("design:type", String)
], MedicalCondition.prototype, "medicalProfileId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING(200),
        allowNull: false,
        comment: 'Medical condition name',
    }),
    __metadata("design:type", String)
], MedicalCondition.prototype, "conditionName", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM(...Object.values(ConditionSeverity)),
        allowNull: true,
        comment: 'Severity of the condition',
    }),
    __metadata("design:type", String)
], MedicalCondition.prototype, "severity", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.DATEONLY,
        allowNull: true,
        comment: 'Date when condition was diagnosed',
    }),
    __metadata("design:type", Date)
], MedicalCondition.prototype, "diagnosedDate", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether condition is chronic (long-term)',
    }),
    __metadata("design:type", Boolean)
], MedicalCondition.prototype, "isChronic", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether condition is currently active',
    }),
    __metadata("design:type", Boolean)
], MedicalCondition.prototype, "isActive", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.TEXT,
        allowNull: true,
        comment: 'Additional notes about the condition',
    }),
    __metadata("design:type", String)
], MedicalCondition.prototype, "notes", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE),
    __metadata("design:type", Date)
], MedicalCondition.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE),
    __metadata("design:type", Date)
], MedicalCondition.prototype, "updatedAt", void 0);
__decorate([
    sequelize_typescript_1.DeletedAt,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE),
    __metadata("design:type", Date)
], MedicalCondition.prototype, "deletedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => MedicalProfile_1.default),
    __metadata("design:type", MedicalProfile_1.default)
], MedicalCondition.prototype, "medicalProfile", void 0);
MedicalCondition = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: 'medical_conditions',
        timestamps: true,
        paranoid: true,
    })
], MedicalCondition);
exports.default = MedicalCondition;
//# sourceMappingURL=MedicalCondition.js.map