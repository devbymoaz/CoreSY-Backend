/**
 * Governorate controller.
 * Handles HTTP requests for governorate endpoints.
 */

const governorateRepository = require('../repositories/governorate.repository');
const { sendSuccess } = require('../helpers/response.helper');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get all active governorates.
 */
const getAllGovernorates = asyncHandler(async (_req, res) => {
  const governorates = await governorateRepository.findAllActive();
  return sendSuccess(res, {
    message: 'Governorates retrieved successfully',
    data: governorates,
  });
});

module.exports = {
  getAllGovernorates,
};
