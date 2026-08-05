/**
 * Governorate controller.
 * Handles HTTP requests for governorate endpoints - robust to database errors!
 */

const governorateRepository = require('../repositories/governorate.repository');
const { sendSuccess, sendError } = require('../helpers/response.helper');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

const { SYRIAN_GOVERNORATES } = require('../constants/governorates');

/**
 * Get all active governorates - with static fallback!
 */
const getAllGovernorates = asyncHandler(async (_req, res) => {
  try {
    const governorates = await governorateRepository.findAllActive();

    if (!governorates.length) {
      logger.warn('No governorates in database, using static fallback list');
      return sendSuccess(res, {
        message: 'Governorates retrieved successfully (static fallback)',
        data: SYRIAN_GOVERNORATES,
      });
    }

    return sendSuccess(res, {
      message: 'Governorates retrieved successfully',
      data: governorates,
    });
  } catch (dbError) {
    logger.warn('Database not available, using static governorate data:', dbError.message);
    return sendSuccess(res, {
      message: 'Governorates retrieved successfully (static fallback)',
      data: SYRIAN_GOVERNORATES,
    });
  }
});

module.exports = {
  getAllGovernorates,
};
