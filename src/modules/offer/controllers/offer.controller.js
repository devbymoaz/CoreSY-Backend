const offerService = require('../services/offer.service');
const { sendSuccess, sendCreated } = require('../../../helpers/response.helper');
const asyncHandler = require('../../../utils/asyncHandler');
const {
  buildPublicFileUrl,
  removeUploadedFile,
} = require('../../../middlewares/upload.middleware');

const createOffer = asyncHandler(async (req, res) => {
  const result = await offerService.createOffer(
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendCreated(res, result);
});

const getOffers = asyncHandler(async (req, res) => {
  const result = await offerService.getOffers(req.query);
  return sendSuccess(res, result);
});

const getOfferById = asyncHandler(async (req, res) => {
  const result = await offerService.getOfferById(req.params.id);
  return sendSuccess(res, result);
});

const updateOffer = asyncHandler(async (req, res) => {
  const result = await offerService.updateOffer(
    req.params.id,
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const deleteOffer = asyncHandler(async (req, res) => {
  const result = await offerService.deleteOffer(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const uploadOfferPhoto = asyncHandler(async (req, res) => {
  try {
    const photoUrl = buildPublicFileUrl(req, req.file);
    const result = await offerService.uploadPhoto(
      req.params.id,
      photoUrl,
      req.user.id,
      req.ip,
      req.headers['user-agent'],
      req.user,
    );
    return sendSuccess(res, result);
  } catch (error) {
    await removeUploadedFile(req.file);
    throw error;
  }
});

module.exports = {
  createOffer,
  getOffers,
  getOfferById,
  updateOffer,
  deleteOffer,
  uploadOfferPhoto,
};
