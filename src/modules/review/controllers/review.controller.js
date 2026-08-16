/**
 * Review controller.
 */

const reviewService = require('../services/review.service');
const { sendSuccess, sendCreated } = require('../../../helpers/response.helper');
const asyncHandler = require('../../../utils/asyncHandler');
const {
  buildPublicFileUrls,
  removeUploadedFiles,
} = require('../../../middlewares/upload.middleware');

const createReview = asyncHandler(async (req, res) => {
  const result = await reviewService.createReview(
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendCreated(res, result);
});

const getReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.getReviews(req.query, req.user);
  return sendSuccess(res, result);
});

const getReviewById = asyncHandler(async (req, res) => {
  const review = await reviewService.getReviewById(req.params.id, req.user);
  return sendSuccess(res, { review });
});

const updateReview = asyncHandler(async (req, res) => {
  const result = await reviewService.updateReview(
    req.params.id,
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const uploadReviewImages = asyncHandler(async (req, res) => {
  try {
    const result = await reviewService.uploadImages(
      req.params.id,
      buildPublicFileUrls(req, req.files),
      req.user.id,
      req.ip,
      req.headers['user-agent'],
      req.user,
    );
    return sendSuccess(res, result);
  } catch (error) {
    await removeUploadedFiles(req.files);
    throw error;
  }
});

const removeReviewImages = asyncHandler(async (req, res) => {
  const result = await reviewService.removeImages(
    req.params.id,
    req.body.images,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const deleteReview = asyncHandler(async (req, res) => {
  const result = await reviewService.deleteReview(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const reportReview = asyncHandler(async (req, res) => {
  const result = await reviewService.reportReview(
    req.params.id,
    req.body.reason,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const likeReview = asyncHandler(async (req, res) => {
  const result = await reviewService.likeReview(req.params.id, req.user.id);
  return sendSuccess(res, result);
});

const getBusinessReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.getBusinessReviews(req.query, req.user);
  return sendSuccess(res, result);
});

const replyToReview = asyncHandler(async (req, res) => {
  const result = await reviewService.replyToReview(
    req.params.id,
    req.body.message,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const getAdminReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.getAdminReviews(req.query, req.user);
  return sendSuccess(res, result);
});

const updateStatus = asyncHandler(async (req, res) => {
  const result = await reviewService.updateStatus(
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const getDashboard = asyncHandler(async (req, res) => {
  const stats = await reviewService.getDashboard(req.user);
  return sendSuccess(res, { stats });
});

module.exports = {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  uploadReviewImages,
  removeReviewImages,
  deleteReview,
  reportReview,
  likeReview,
  getBusinessReviews,
  replyToReview,
  getAdminReviews,
  updateStatus,
  getDashboard,
};
