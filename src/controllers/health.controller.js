/**
 * Health check controller.
 * Handles HTTP requests for health endpoints - simple and reliable!
 */

const { sendSuccess } = require('../helpers/response.helper');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config');

/**
 * GET /health - Simple health check (no database required!)
 */
const getHealth = asyncHandler(async (_req, res) => {
  return sendSuccess(res, {
    message: 'CoreSY Backend is running!',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.env,
      appName: config.appName,
    },
  });
});

module.exports = {
  getHealth,
};
