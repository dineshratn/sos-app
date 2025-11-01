import { Sequelize } from 'sequelize-typescript';
import config from '../config';
import logger from '../utils/logger';
import UserProfile from '../models/UserProfile';
import EmergencyContact from '../models/EmergencyContact';

const sequelize = new Sequelize({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  username: config.database.username,
  password: config.database.password,
  dialect: config.database.dialect,
  logging: config.database.logging ? (msg) => logger.debug(msg) : false,
  models: [UserProfile, EmergencyContact],
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    throw error;
  }
};

export const syncDatabase = async (force = false): Promise<void> => {
  try {
    await sequelize.sync({ force });
    logger.info(`Database synchronized ${force ? '(forced)' : ''}`);
  } catch (error) {
    logger.error('Database sync failed:', error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
    throw error;
  }
};

export default sequelize;
