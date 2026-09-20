const rewardService = require('../services/reward.service');
const { sendSuccess, sendCreated } = require('../../../helpers/response.helper');
const asyncHandler = require('../../../utils/asyncHandler');
const {
  buildPublicFileUrl,
  removeUploadedFile,
} = require('../../../middlewares/upload.middleware');

const createReward = asyncHandler(async (req, res) => {
  const result = await rewardService.createReward(
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendCreated(res, result);
});

const getRewards = asyncHandler(async (req, res) => {
  const result = await rewardService.getRewards(req.query);
  return sendSuccess(res, result);
});

const getRewardById = asyncHandler(async (req, res) => {
  const result = await rewardService.getRewardById(req.params.id);
  return sendSuccess(res, result);
});

const updateReward = asyncHandler(async (req, res) => {
  const result = await rewardService.updateReward(
    req.params.id,
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const deleteReward = asyncHandler(async (req, res) => {
  const result = await rewardService.deleteReward(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const uploadRewardPhoto = asyncHandler(async (req, res) => {
  try {
    const photoUrl = buildPublicFileUrl(req, req.file);
    const result = await rewardService.uploadPhoto(
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

const redeemReward = asyncHandler(async (req, res) => {
  const result = await rewardService.redeemReward(
    req.body.rewardId,
    req.user,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

module.exports = {
  createReward,
  getRewards,
  getRewardById,
  updateReward,
  deleteReward,
  uploadRewardPhoto,
  redeemReward,
};
