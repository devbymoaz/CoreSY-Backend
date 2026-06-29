/**
 * Application entry point and HTTP server bootstrap.
 * Simple, stable, and reliable server startup.
 */

const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { connectDatabase } = require('./config/database');

let server = null;

/**
 * Bootstrap and start the application server.
 */
const startServer = async () => {
  try {
    logger.info('Starting CoreSY Backend...');

    // Try to connect to database, but start server even if it fails
    try {
      await connectDatabase();
      logger.info('Database connected successfully');
    } catch (dbError) {
      logger.error('Database connection failed:', dbError.message);
    }

    // Start HTTP server immediately - super simple and reliable
    server = app.listen(config.port, () => {
      logger.info(`${config.appName} server running on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`API: http://localhost:${config.port}${config.apiPrefix}`);
      logger.info(`Swagger Docs: http://localhost:${config.port}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    // Last resort: try to start anyway
    server = app.listen(config.port, () => {
      logger.info(`${config.appName} server running on port ${config.port} (recovery mode)`);
    });
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
