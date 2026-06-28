/**
 * Health check controller.
 * Handles HTTP requests for health endpoints - delegates to service layer.
 */

const healthService = require('../services/health.service');
const { sendSuccess } = require('../helpers/response.helper');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /health - Application health check
 */
const getHealth = asyncHandler(async (_req, res) => {
  const healthData = await healthService.getHealthStatus();
  return sendSuccess(res, {
    message: healthData.message,
    data: healthData,
  });
});

module.exports = {
  getHealth,
};
