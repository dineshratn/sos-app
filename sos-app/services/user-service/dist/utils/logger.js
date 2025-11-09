"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const config_1 = __importDefault(require("../config"));
const { combine, timestamp, printf, colorize, json, errors } = winston_1.default.format;
// Custom format for console logging
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});
// Create logger instance
const logger = winston_1.default.createLogger({
    level: config_1.default.logging.level,
    format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })),
    defaultMeta: { service: config_1.default.serviceName },
    transports: [],
});
// Console transport for development
if (config_1.default.nodeEnv === 'development') {
    logger.add(new winston_1.default.transports.Console({
        format: combine(colorize(), consoleFormat),
    }));
}
else {
    // JSON format for production
    logger.add(new winston_1.default.transports.Console({
        format: json(),
    }));
}
// File transports for production
if (config_1.default.nodeEnv === 'production') {
    logger.add(new winston_1.default.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: json(),
    }));
    logger.add(new winston_1.default.transports.File({
        filename: 'logs/combined.log',
        format: json(),
    }));
}
exports.default = logger;
//# sourceMappingURL=logger.js.map