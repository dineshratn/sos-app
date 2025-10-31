import { Sequelize } from 'sequelize-typescript';
import config from '../config';
import User from '../models/User';
import Session from '../models/Session';
import logger from '../utils/logger';

const sequelize = new Sequelize({
  database: config.database.name,
  host: config.database.host,
  port: config.database.port,
  username: config.database.user,
  password: config.database.password,
  dialect: 'postgres',
  models: [User, Session],
  logging: (msg) => logger.debug(msg),
  pool: {
    max: config.database.pool.max,
    min: config.database.pool.min,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    ssl: config.database.sslMode !== 'disable' ? {
      require: true,
      rejectUnauthorized: false,
    } : false,
  },
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully');
  } catch (error) {
    logger.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

export const syncDatabase = async (force: boolean = false): Promise<void> => {
  try {
    await sequelize.sync({ force, alter: !force && config.nodeEnv === 'development' });
    logger.info('✅ Database synchronized successfully');
  } catch (error) {
    logger.error('❌ Database synchronization failed:', error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

export default sequelize;
