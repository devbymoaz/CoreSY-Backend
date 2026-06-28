/**
 * Prisma client singleton initialization.
 * Ensures a single database connection instance across the application lifecycle.
 */

const { PrismaClient } = require('@prisma/client');
const config = require('./index');
const logger = require('../utils/logger');

const prisma = new PrismaClient({
  log:
    config.env === 'development'
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ]
      : [{ emit: 'event', level: 'error' }],
});

// Log Prisma events in development
if (config.env === 'development') {
  prisma.$on('query', (event) => {
    logger.debug(`Query: ${event.query} | Duration: ${event.duration}ms`);
  });
}

prisma.$on('error', (event) => {
  logger.error('Prisma error:', event);
});

prisma.$on('warn', (event) => {
  logger.warn('Prisma warning:', event);
});

/**
 * Connect to the PostgreSQL database via Prisma.
 * @returns {Promise<void>}
 */
const connectDatabase = async () => {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL database connected successfully via Prisma');
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL database:', error);
    throw error;
  }
};

/**
 * Gracefully disconnect from the database.
 * @returns {Promise<void>}
 */
const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    logger.info('PostgreSQL database disconnected');
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
    throw error;
  }
};

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
};
