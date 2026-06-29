/**
 * Debug controller - help diagnose issues!
 */

const { sendSuccess } = require('../helpers/response.helper');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

/**
 * GET /debug - Debug info endpoint (no secrets exposed!)
 */
const getDebugInfo = asyncHandler(async (_req, res) => {
  const envInfo = {
    NODE_ENV: process.env.NODE_ENV || 'not set',
    PORT: process.env.PORT || 'not set',
    DATABASE_URL_SET: !!process.env.DATABASE_URL,
    DATABASE_URL_LENGTH: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0,
    REDIS_URL_SET: !!process.env.REDIS_URL,
    APP_NAME: process.env.APP_NAME || 'CoreSY',
  };

  logger.info('Debug info requested:', envInfo);

  return sendSuccess(res, {
    message: 'Debug info (no secrets exposed)',
    data: envInfo,
  });
});

module.exports = {
  getDebugInfo,
};
