"use strict";
/**
 * Message Model
 * Represents a message in an emergency communication room
 * Task 124: Message model with comprehensive typing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickResponseType = exports.MessageStatus = exports.MessageType = exports.SenderRole = void 0;
var SenderRole;
(function (SenderRole) {
    SenderRole["USER"] = "USER";
    SenderRole["CONTACT"] = "CONTACT";
    SenderRole["RESPONDER"] = "RESPONDER";
    SenderRole["ADMIN"] = "ADMIN";
    SenderRole["SYSTEM"] = "SYSTEM";
})(SenderRole || (exports.SenderRole = SenderRole = {}));
var MessageType;
(function (MessageType) {
    MessageType["TEXT"] = "TEXT";
    MessageType["VOICE"] = "VOICE";
    MessageType["IMAGE"] = "IMAGE";
    MessageType["VIDEO"] = "VIDEO";
    MessageType["LOCATION"] = "LOCATION";
    MessageType["QUICK_RESPONSE"] = "QUICK_RESPONSE";
    MessageType["SYSTEM"] = "SYSTEM";
})(MessageType || (exports.MessageType = MessageType = {}));
var MessageStatus;
(function (MessageStatus) {
    MessageStatus["SENDING"] = "SENDING";
    MessageStatus["SENT"] = "SENT";
    MessageStatus["DELIVERED"] = "DELIVERED";
    MessageStatus["READ"] = "READ";
    MessageStatus["FAILED"] = "FAILED";
})(MessageStatus || (exports.MessageStatus = MessageStatus = {}));
var QuickResponseType;
(function (QuickResponseType) {
    QuickResponseType["NEED_AMBULANCE"] = "NEED_AMBULANCE";
    QuickResponseType["NEED_POLICE"] = "NEED_POLICE";
    QuickResponseType["NEED_FIRE"] = "NEED_FIRE";
    QuickResponseType["TRAPPED"] = "TRAPPED";
    QuickResponseType["FIRE"] = "FIRE";
    QuickResponseType["SAFE_NOW"] = "SAFE_NOW";
    QuickResponseType["NEED_HELP"] = "NEED_HELP";
    QuickResponseType["SEND_LOCATION"] = "SEND_LOCATION";
})(QuickResponseType || (exports.QuickResponseType = QuickResponseType = {}));
//# sourceMappingURL=Message.js.map