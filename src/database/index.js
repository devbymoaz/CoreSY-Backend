/**
 * Database utilities and seed helpers.
 * Placeholder for database seeding, migrations helpers, and maintenance scripts.
 */

const { prisma } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Check database connectivity.
 * @returns {Promise<boolean>}
 */
const checkDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database connection check failed:', error);
    return false;
  }
};

module.exports = {
  checkDatabaseConnection,
};
