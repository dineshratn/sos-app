"use strict";
/**
 * Participant Model
 * Represents a user participating in an emergency room
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyStatus = exports.ParticipantRole = void 0;
var ParticipantRole;
(function (ParticipantRole) {
    ParticipantRole["USER"] = "USER";
    ParticipantRole["CONTACT"] = "CONTACT";
    ParticipantRole["RESPONDER"] = "RESPONDER";
    ParticipantRole["ADMIN"] = "ADMIN";
})(ParticipantRole || (exports.ParticipantRole = ParticipantRole = {}));
var EmergencyStatus;
(function (EmergencyStatus) {
    EmergencyStatus["PENDING"] = "PENDING";
    EmergencyStatus["ACTIVE"] = "ACTIVE";
    EmergencyStatus["CANCELLED"] = "CANCELLED";
    EmergencyStatus["RESOLVED"] = "RESOLVED";
})(EmergencyStatus || (exports.EmergencyStatus = EmergencyStatus = {}));
//# sourceMappingURL=participant.model.js.map