import { Sequelize } from 'sequelize-typescript';
import config from './index';
import logger from '../utils/logger';

const sequelize = new Sequelize({
  database: config.database.name,
  dialect: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  logging: config.nodeEnv === 'development' ? (msg) => logger.debug(msg) : false,
  pool: {
    min: config.database.poolMin,
    max: config.database.poolMax,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    ssl: config.database.ssl
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

export const connectDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Medical Service database connection established successfully');

    if (config.nodeEnv === 'development') {
      await sequelize.sync({ alter: false });
      logger.info('Database models synchronized');
    }
  } catch (error) {
    logger.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

export const closeDatabaseConnection = async (): Promise<void> => {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
    throw error;
  }
};

export default sequelize;
