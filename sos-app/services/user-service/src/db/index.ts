import { Sequelize } from 'sequelize-typescript';
import config from '../config';
import logger from '../utils/logger';
import path from 'path';

// Create Sequelize instance
const sequelize = new Sequelize({
  database: config.database.name,
  username: config.database.user,
  password: config.database.password,
  host: config.database.host,
  port: config.database.port,
  dialect: config.database.dialect,
  pool: config.database.pool,
  logging: config.database.logging ? (msg) => logger.debug(msg) : false,
  models: [path.join(__dirname, '../models')],
});

/**
 * Test database connection
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully');
  } catch (error) {
    logger.error('❌ Unable to connect to database:', error);
    throw error;
  }
};

/**
 * Sync database models
 * @param force If true, drops existing tables
 */
export const syncDatabase = async (force: boolean = false): Promise<void> => {
  try {
    await sequelize.sync({ force, alter: !force && config.nodeEnv === 'development' });
    logger.info(`✅ Database synchronized ${force ? '(forced)' : ''}`);
  } catch (error) {
    logger.error('❌ Database sync failed:', error);
    throw error;
  }
};

/**
 * Close database connection
 */
export const closeDatabase = async (): Promise<void> => {
  try {
    await sequelize.close();
    logger.info('✅ Database connection closed');
  } catch (error) {
    logger.error('❌ Error closing database connection:', error);
    throw error;
  }
};

export default sequelize;
