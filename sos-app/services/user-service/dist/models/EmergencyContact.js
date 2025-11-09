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
exports.ContactPriority = exports.ContactRelationship = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const uuid_1 = require("uuid");
const UserProfile_1 = __importDefault(require("./UserProfile"));
var ContactRelationship;
(function (ContactRelationship) {
    ContactRelationship["SPOUSE"] = "spouse";
    ContactRelationship["PARENT"] = "parent";
    ContactRelationship["CHILD"] = "child";
    ContactRelationship["SIBLING"] = "sibling";
    ContactRelationship["FRIEND"] = "friend";
    ContactRelationship["PARTNER"] = "partner";
    ContactRelationship["RELATIVE"] = "relative";
    ContactRelationship["GUARDIAN"] = "guardian";
    ContactRelationship["CAREGIVER"] = "caregiver";
    ContactRelationship["NEIGHBOR"] = "neighbor";
    ContactRelationship["COLLEAGUE"] = "colleague";
    ContactRelationship["OTHER"] = "other";
})(ContactRelationship || (exports.ContactRelationship = ContactRelationship = {}));
var ContactPriority;
(function (ContactPriority) {
    ContactPriority[ContactPriority["CRITICAL"] = 1] = "CRITICAL";
    ContactPriority[ContactPriority["HIGH"] = 2] = "HIGH";
    ContactPriority[ContactPriority["MEDIUM"] = 3] = "MEDIUM";
    ContactPriority[ContactPriority["LOW"] = 4] = "LOW";
})(ContactPriority || (exports.ContactPriority = ContactPriority = {}));
let EmergencyContact = class EmergencyContact extends sequelize_typescript_1.Model {
    userProfileId;
    name;
    relationship;
    phoneNumber;
    alternatePhoneNumber;
    email;
    address;
    city;
    state;
    country;
    postalCode;
    isPrimary;
    priority;
    notes;
    isActive;
    // Associations
    userProfile;
    /**
     * Check if contact has complete information
     */
    isComplete() {
        return !!(this.name && this.phoneNumber && this.relationship);
    }
    /**
     * Get display name with relationship
     */
    getDisplayName() {
        return `${this.name} (${this.relationship})`;
    }
    /**
     * Return safe object
     */
    toSafeObject() {
        return {
            id: this.id,
            userProfileId: this.userProfileId,
            name: this.name,
            relationship: this.relationship,
            phoneNumber: this.phoneNumber,
            alternatePhoneNumber: this.alternatePhoneNumber,
            email: this.email,
            address: this.address,
            city: this.city,
            state: this.state,
            country: this.country,
            postalCode: this.postalCode,
            isPrimary: this.isPrimary,
            priority: this.priority,
            notes: this.notes,
            isActive: this.isActive,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
    /**
     * Return minimal contact info (for notifications)
     */
    toMinimalContact() {
        return {
            id: this.id,
            name: this.name,
            phoneNumber: this.phoneNumber,
            relationship: this.relationship,
        };
    }
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    (0, sequelize_typescript_1.Default)(uuid_1.v4),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID),
    __metadata("design:type", String)
], EmergencyContact.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => UserProfile_1.default),
    sequelize_typescript_1.Index,
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        allowNull: false,
    }),
    __metadata("design:type", String)
], EmergencyContact.prototype, "userProfileId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING(200),
        allowNull: false,
    }),
    __metadata("design:type", String)
], EmergencyContact.prototype, "name", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM(...Object.values(ContactRelationship)),
        allowNull: false,
    }),
    __metadata("design:type", String)
], EmergencyContact.prototype, "relationship", void 0);
__decorate([
    sequelize_typescript_1.Index,
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING(20),
        allowNull: false,
    }),
    __metadata("design:type", String)
], EmergencyContact.prototype, "phoneNumber", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING(20)),
    __metadata("design:type", String)
], EmergencyContact.prototype, "alternatePhoneNumber", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING(255)),
    __metadata("design:type", String)
], EmergencyContact.prototype, "email", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT),
    __metadata("design:type", String)
], EmergencyContact.prototype, "address", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING(100)),
    __metadata("design:type", String)
], EmergencyContact.prototype, "city", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING(100)),
    __metadata("design:type", String)
], EmergencyContact.prototype, "state", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING(100)),
    __metadata("design:type", String)
], EmergencyContact.prototype, "country", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING(20)),
    __metadata("design:type", String)
], EmergencyContact.prototype, "postalCode", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN),
    __metadata("design:type", Boolean)
], EmergencyContact.prototype, "isPrimary", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(1),
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.INTEGER,
        allowNull: false,
    }),
    __metadata("design:type", Number)
], EmergencyContact.prototype, "priority", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT),
    __metadata("design:type", String)
], EmergencyContact.prototype, "notes", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN),
    __metadata("design:type", Boolean)
], EmergencyContact.prototype, "isActive", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE),
    __metadata("design:type", Date)
], EmergencyContact.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE),
    __metadata("design:type", Date)
], EmergencyContact.prototype, "updatedAt", void 0);
__decorate([
    sequelize_typescript_1.DeletedAt,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE),
    __metadata("design:type", Object)
], EmergencyContact.prototype, "deletedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => UserProfile_1.default),
    __metadata("design:type", UserProfile_1.default)
], EmergencyContact.prototype, "userProfile", void 0);
EmergencyContact = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: 'emergency_contacts',
        timestamps: true,
        paranoid: true,
        underscored: true,
    })
], EmergencyContact);
exports.default = EmergencyContact;
//# sourceMappingURL=EmergencyContact.js.map