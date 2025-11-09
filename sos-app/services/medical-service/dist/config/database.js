"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabaseConnection = exports.connectDatabase = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const index_1 = __importDefault(require("./index"));
const logger_1 = __importDefault(require("../utils/logger"));
const sequelize = new sequelize_typescript_1.Sequelize({
    database: index_1.default.database.name,
    dialect: 'postgres',
    host: index_1.default.database.host,
    port: index_1.default.database.port,
    username: index_1.default.database.username,
    password: index_1.default.database.password,
    logging: index_1.default.nodeEnv === 'development' ? (msg) => logger_1.default.debug(msg) : false,
    pool: {
        min: index_1.default.database.poolMin,
        max: index_1.default.database.poolMax,
        acquire: 30000,
        idle: 10000,
    },
    dialectOptions: {
        ssl: index_1.default.database.ssl
            ? {
                require: true,
                rejectUnauthorized: false,
            }
            : false,
    },
    models: [__dirname + '/../models'],
    modelMatch: (filename, member) => {
        return filename.substring(0, filename.indexOf('.model')) === member.toLowerCase();
    },
});
const connectDatabase = async () => {
    try {
        await sequelize.authenticate();
        logger_1.default.info('✅ Medical Service database connection established successfully');
        if (index_1.default.nodeEnv === 'development') {
            await sequelize.sync({ alter: false });
            logger_1.default.info('Database models synchronized');
        }
    }
    catch (error) {
        logger_1.default.error('❌ Unable to connect to the database:', error);
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
const closeDatabaseConnection = async () => {
    try {
        await sequelize.close();
        logger_1.default.info('Database connection closed');
    }
    catch (error) {
        logger_1.default.error('Error closing database connection:', error);
        throw error;
    }
};
exports.closeDatabaseConnection = closeDatabaseConnection;
exports.default = sequelize;
//# sourceMappingURL=database.js.map