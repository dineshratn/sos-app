"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPriority = exports.NotificationStatus = exports.NotificationChannel = void 0;
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["PUSH"] = "PUSH";
    NotificationChannel["SMS"] = "SMS";
    NotificationChannel["EMAIL"] = "EMAIL";
    NotificationChannel["WEBSOCKET"] = "WEBSOCKET";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["PENDING"] = "PENDING";
    NotificationStatus["QUEUED"] = "QUEUED";
    NotificationStatus["SENT"] = "SENT";
    NotificationStatus["DELIVERED"] = "DELIVERED";
    NotificationStatus["FAILED"] = "FAILED";
    NotificationStatus["RETRY"] = "RETRY";
})(NotificationStatus || (exports.NotificationStatus = NotificationStatus = {}));
var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority["LOW"] = "LOW";
    NotificationPriority["NORMAL"] = "NORMAL";
    NotificationPriority["HIGH"] = "HIGH";
    NotificationPriority["EMERGENCY"] = "EMERGENCY";
})(NotificationPriority || (exports.NotificationPriority = NotificationPriority = {}));
//# sourceMappingURL=Notification.js.map