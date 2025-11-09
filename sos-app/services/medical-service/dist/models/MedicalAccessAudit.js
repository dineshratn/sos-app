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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessRole = exports.AccessReason = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
var AccessReason;
(function (AccessReason) {
    AccessReason["EMERGENCY"] = "emergency";
    AccessReason["ROUTINE_CARE"] = "routine_care";
    AccessReason["USER_REQUEST"] = "user_request";
    AccessReason["EMERGENCY_CONTACT"] = "emergency_contact";
    AccessReason["FIRST_RESPONDER"] = "first_responder";
    AccessReason["ADMINISTRATIVE"] = "administrative";
    AccessReason["SYSTEM"] = "system";
})(AccessReason || (exports.AccessReason = AccessReason = {}));
var AccessRole;
(function (AccessRole) {
    AccessRole["USER"] = "user";
    AccessRole["EMERGENCY_CONTACT"] = "emergency_contact";
    AccessRole["FIRST_RESPONDER"] = "first_responder";
    AccessRole["PHYSICIAN"] = "physician";
    AccessRole["ADMIN"] = "admin";
    AccessRole["SYSTEM"] = "system";
})(AccessRole || (exports.AccessRole = AccessRole = {}));
/**
 * Medical Access Audit Log
 *
 * HIPAA requires comprehensive audit logging for all access to PHI (Protected Health Information).
 * This table is append-only and immutable for compliance purposes.
 */
let MedicalAccessAudit = class MedicalAccessAudit extends sequelize_typescript_1.Model {
    /**
     * Get safe object for API response
     */
    toSafeObject() {
        return {
            id: this.id,
            accessedBy: this.accessedBy,
            accessedByRole: this.accessedByRole,
            reason: this.reason,
            action: this.action,
            ipAddress: this.ipAddress,
            emergencyId: this.emergencyId,
            dataAccessed: this.dataAccessed,
            timestamp: this.timestamp,
        };
    }
    /**
     * Check if access was during an emergency
     */
    isEmergencyAccess() {
        return (this.reason === AccessReason.EMERGENCY ||
            this.reason === AccessReason.FIRST_RESPONDER ||
            this.reason === AccessReason.EMERGENCY_CONTACT);
    }
    /**
     * Check if access was authorized
     */
    isAuthorizedAccess() {
        return (this.accessedByRole === AccessRole.USER ||
            this.accessedByRole === AccessRole.PHYSICIAN ||
            (this.accessedByRole === AccessRole.EMERGENCY_CONTACT && this.emergencyId !== undefined) ||
            (this.accessedByRole === AccessRole.FIRST_RESPONDER && this.emergencyId !== undefined));
    }
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    (0, sequelize_typescript_1.Default)(sequelize_typescript_1.DataType.UUIDV4),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID),
    __metadata("design:type", String)
], MedicalAccessAudit.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        allowNull: false,
        comment: 'Reference to medical profile that was accessed',
    }),
    __metadata("design:type", String)
], MedicalAccessAudit.prototype, "medicalProfileId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING(255),
        allowNull: false,
        comment: 'ID of user/system that accessed the data',
    }),
    __metadata("design:type", String)
], MedicalAccessAudit.prototype, "accessedBy", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM(...Object.values(AccessRole)),
        allowNull: false,
        comment: 'Role of the accessor',
    }),
    __metadata("design:type", String)
], MedicalAccessAudit.prototype, "accessedByRole", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM(...Object.values(AccessReason)),
        allowNull: false,
        comment: 'Reason for accessing medical data',
    }),
    __metadata("design:type", String)
], MedicalAccessAudit.prototype, "reason", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING(100),
        allowNull: false,
        comment: 'Action performed (view, update, delete, export)',
    }),
    __metadata("design:type", String)
], MedicalAccessAudit.prototype, "action", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.INET,
        allowNull: true,
        comment: 'IP address of the accessor',
    }),
    __metadata("design:type", String)
], MedicalAccessAudit.prototype, "ipAddress", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.TEXT,
        allowNull: true,
        comment: 'User agent string from the request',
    }),
    __metadata("design:type", String)
], MedicalAccessAudit.prototype, "userAgent", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        allowNull: true,
        comment: 'Emergency ID if access was during an emergency',
    }),
    __metadata("design:type", String)
], MedicalAccessAudit.prototype, "emergencyId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING(500),
        allowNull: true,
        comment: 'Hashed access token used (for verification)',
    }),
    __metadata("design:type", String)
], MedicalAccessAudit.prototype, "accessToken", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.JSONB,
        allowNull: true,
        comment: 'List of specific data fields accessed',
    }),
    __metadata("design:type", Array)
], MedicalAccessAudit.prototype, "dataAccessed", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    (0, sequelize_typescript_1.Default)(sequelize_typescript_1.DataType.NOW),
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.DATE,
        allowNull: false,
        field: 'timestamp',
        comment: 'Timestamp of access (immutable)',
    }),
    __metadata("design:type", Date)
], MedicalAccessAudit.prototype, "timestamp", void 0);
MedicalAccessAudit = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: 'medical_access_audit',
        timestamps: false, // We use a custom timestamp field
        paranoid: false, // No soft deletes - audit logs are immutable
    })
], MedicalAccessAudit);
exports.default = MedicalAccessAudit;
//# sourceMappingURL=MedicalAccessAudit.js.map