import { Sequelize } from 'sequelize-typescript';
declare const sequelize: Sequelize;
/**
 * Test database connection
 */
export declare const connectDatabase: () => Promise<void>;
/**
 * Sync database models
 * @param force If true, drops existing tables
 */
export declare const syncDatabase: (force?: boolean) => Promise<void>;
/**
 * Close database connection
 */
export declare const closeDatabase: () => Promise<void>;
export default sequelize;
//# sourceMappingURL=index.d.ts.map