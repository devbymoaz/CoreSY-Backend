/**
 * Governorate controller.
 * Handles HTTP requests for governorate endpoints - robust to database errors!
 */

const governorateRepository = require('../repositories/governorate.repository');
const { sendSuccess, sendError } = require('../helpers/response.helper');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

// Static governorate data as fallback if database is not available
const STATIC_GOVERNORATES = [
  { id: 'static-damascus', name: 'Damascus', nameAr: 'دمشق', code: 'DM' },
  { id: 'static-aleppo', name: 'Aleppo', nameAr: 'حلب', code: 'AL' },
  { id: 'static-homs', name: 'Homs', nameAr: 'حمص', code: 'HO' },
  { id: 'static-hama', name: 'Hama', nameAr: 'حماة', code: 'HA' },
  { id: 'static-latakia', name: 'Latakia', nameAr: 'اللاذقية', code: 'LA' },
  { id: 'static-tartus', name: 'Tartus', nameAr: 'طرطوس', code: 'TA' },
  { id: 'static-idlib', name: 'Idlib', nameAr: 'إدلب', code: 'ID' },
  { id: 'static-deir-ez-zor', name: 'Deir ez-Zor', nameAr: 'دير الزور', code: 'DZ' },
  { id: 'static-raqqa', name: 'Raqqa', nameAr: 'الرقة', code: 'RQ' },
  { id: 'static-hasakah', name: 'Hasakah', nameAr: 'الحسكة', code: 'HK' },
  { id: 'static-daraa', name: 'Daraa', nameAr: 'درعا', code: 'DR' },
  { id: 'static-quneitra', name: 'Quneitra', nameAr: 'القنيطرة', code: 'QU' },
  { id: 'static-suwayda', name: 'Suwayda', nameAr: 'السويداء', code: 'SW' },
  {
    id: 'static-damascus-countryside',
    name: 'Damascus Countryside',
    nameAr: 'ريف دمشق',
    code: 'RD',
  },
];

/**
 * Get all active governorates - with static fallback!
 */
const getAllGovernorates = asyncHandler(async (_req, res) => {
  try {
    const governorates = await governorateRepository.findAllActive();
    return sendSuccess(res, {
      message: 'Governorates retrieved successfully (from database)',
      data: governorates,
    });
  } catch (dbError) {
    logger.warn('Database not available, using static governorate data:', dbError.message);
    return sendSuccess(res, {
      message: 'Governorates retrieved successfully (static fallback)',
      data: STATIC_GOVERNORATES,
    });
  }
});

module.exports = {
  getAllGovernorates,
};
