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
exports.AllergySeverity = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const MedicalProfile_1 = __importDefault(require("./MedicalProfile"));
var AllergySeverity;
(function (AllergySeverity) {
    AllergySeverity["MILD"] = "mild";
    AllergySeverity["MODERATE"] = "moderate";
    AllergySeverity["SEVERE"] = "severe";
    AllergySeverity["LIFE_THREATENING"] = "life_threatening";
})(AllergySeverity || (exports.AllergySeverity = AllergySeverity = {}));
let MedicalAllergy = class MedicalAllergy extends sequelize_typescript_1.Model {
    /**
     * Get safe object for API response
     */
    toSafeObject() {
        return {
            id: this.id,
            allergen: this.allergen,
            severity: this.severity,
            reaction: this.reaction,
            diagnosedDate: this.diagnosedDate,
            notes: this.notes,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
    /**
     * Check if allergy is critical (severe or life-threatening)
     */
    isCritical() {
        return (this.severity === AllergySeverity.SEVERE ||
            this.severity === AllergySeverity.LIFE_THREATENING);
    }
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    (0, sequelize_typescript_1.Default)(sequelize_typescript_1.DataType.UUIDV4),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID),
    __metadata("design:type", String)
], MedicalAllergy.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => MedicalProfile_1.default),
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        allowNull: false,
        comment: 'Reference to medical profile',
    }),
    __metadata("design:type", String)
], MedicalAllergy.prototype, "medicalProfileId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING(200),
        allowNull: false,
        comment: 'Allergen name (e.g., Penicillin, Peanuts)',
    }),
    __metadata("design:type", String)
], MedicalAllergy.prototype, "allergen", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM(...Object.values(AllergySeverity)),
        allowNull: false,
        comment: 'Severity of allergic reaction',
    }),
    __metadata("design:type", String)
], MedicalAllergy.prototype, "severity", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING(500),
        allowNull: true,
        comment: 'Description of allergic reaction',
    }),
    __metadata("design:type", String)
], MedicalAllergy.prototype, "reaction", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.DATEONLY,
        allowNull: true,
        comment: 'Date when allergy was diagnosed',
    }),
    __metadata("design:type", Date)
], MedicalAllergy.prototype, "diagnosedDate", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.TEXT,
        allowNull: true,
        comment: 'Additional notes about the allergy',
    }),
    __metadata("design:type", String)
], MedicalAllergy.prototype, "notes", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE),
    __metadata("design:type", Date)
], MedicalAllergy.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE),
    __metadata("design:type", Date)
], MedicalAllergy.prototype, "updatedAt", void 0);
__decorate([
    sequelize_typescript_1.DeletedAt,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE),
    __metadata("design:type", Date)
], MedicalAllergy.prototype, "deletedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => MedicalProfile_1.default),
    __metadata("design:type", MedicalProfile_1.default)
], MedicalAllergy.prototype, "medicalProfile", void 0);
MedicalAllergy = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: 'medical_allergies',
        timestamps: true,
        paranoid: true,
    })
], MedicalAllergy);
exports.default = MedicalAllergy;
//# sourceMappingURL=MedicalAllergy.js.map