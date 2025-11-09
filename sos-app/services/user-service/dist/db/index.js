"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabase = exports.syncDatabase = exports.connectDatabase = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
const path_1 = __importDefault(require("path"));
// Create Sequelize instance
const sequelize = new sequelize_typescript_1.Sequelize({
    database: config_1.default.database.name,
    username: config_1.default.database.user,
    password: config_1.default.database.password,
    host: config_1.default.database.host,
    port: config_1.default.database.port,
    dialect: config_1.default.database.dialect,
    pool: config_1.default.database.pool,
    logging: config_1.default.database.logging ? (msg) => logger_1.default.debug(msg) : false,
    models: [path_1.default.join(__dirname, '../models')],
});
/**
 * Test database connection
 */
const connectDatabase = async () => {
    try {
        await sequelize.authenticate();
        logger_1.default.info('✅ Database connection established successfully');
    }
    catch (error) {
        logger_1.default.error('❌ Unable to connect to database:', error);
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
/**
 * Sync database models
 * @param force If true, drops existing tables
 */
const syncDatabase = async (force = false) => {
    try {
        await sequelize.sync({ force, alter: !force && config_1.default.nodeEnv === 'development' });
        logger_1.default.info(`✅ Database synchronized ${force ? '(forced)' : ''}`);
    }
    catch (error) {
        logger_1.default.error('❌ Database sync failed:', error);
        throw error;
    }
};
exports.syncDatabase = syncDatabase;
/**
 * Close database connection
 */
const closeDatabase = async () => {
    try {
        await sequelize.close();
        logger_1.default.info('✅ Database connection closed');
    }
    catch (error) {
        logger_1.default.error('❌ Error closing database connection:', error);
        throw error;
    }
};
exports.closeDatabase = closeDatabase;
exports.default = sequelize;
//# sourceMappingURL=index.js.map