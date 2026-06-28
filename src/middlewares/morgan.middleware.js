/**
 * Morgan HTTP request logger middleware configuration.
 * Streams HTTP logs to Winston for unified logging.
 */

const morgan = require('morgan');
const config = require('../config');
const logger = require('../utils/logger');

// Stream Morgan output to Winston
const stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

// Skip logging health checks in production to reduce noise
const skip = (req) => {
  return config.env === 'production' && req.url === '/api/v1/health';
};

const morganMiddleware = morgan(
  config.env === 'development' ? 'dev' : ':remote-addr - :method :url :status :response-time ms',
  { stream, skip },
);

module.exports = morganMiddleware;
