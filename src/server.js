/**
 * Application entry point and HTTP server bootstrap.
 * Initializes database, runs migrations, seeds data, and starts server.
 */

const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { connectRedis, disconnectRedis } = require('./config/redis');
const { execSync } = require('child_process');
const { seed } = require('../prisma/seed');

let server = null;

/**
 * Run Prisma migrations and seed data.
 */
const runMigrationsAndSeed = async () => {
  try {
    logger.info('Running Prisma migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: config.database.url } });
    logger.info('Migrations completed successfully!');

    logger.info('Seeding database...');
    // Run seed function
    await seed();
    logger.info('Database seeded successfully!');
  } catch (error) {
    logger.warn('Migrations/seed might have already run, continuing:', error.message);
  }
};

/**
 * Bootstrap and start the application server.
 */
const startServer = async () => {
  try {
    logger.info('Starting CoreSY Backend...');

    // Initialize database connection first
    await connectDatabase();
    logger.info('Database connected successfully');

    // Run migrations and seed
    await runMigrationsAndSeed();

    // Initialize Redis connection (optional, don't crash if fails)
    try {
      await connectRedis();
      logger.info('Redis connected successfully');
    } catch (redisError) {
      logger.warn('Redis connection failed, but server will start anyway:', redisError.message);
    }

    // Start HTTP server
    server = app.listen(config.port, () => {
      logger.info(`${config.appName} server running on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`API: http://localhost:${config.port}${config.apiPrefix}`);
      logger.info(`Swagger Docs: http://localhost:${config.port}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

/**
 * Graceful shutdown handler for SIGTERM and SIGINT signals.
 * @param {string} signal - OS signal received
 */
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await disconnectDatabase();
        await disconnectRedis();
        logger.info('All connections closed. Exiting process.');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Start the server
startServer();
