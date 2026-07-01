const branchService = require('../services/branch.service');
const { sendSuccess, sendCreated } = require('../../../../src/helpers/response.helper');
const asyncHandler = require('../../../../src/utils/asyncHandler');

const createBranch = asyncHandler(async (req, res) => {
  const result = await branchService.createBranch(
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendCreated(res, result);
});

const getBranches = asyncHandler(async (req, res) => {
  const result = await branchService.getBranches(req.query, req.user);
  return sendSuccess(res, result);
});

const getBranchById = asyncHandler(async (req, res) => {
  const branch = await branchService.getBranchById(req.params.id, req.user);
  return sendSuccess(res, { branch });
});

const getBusinessBranches = asyncHandler(async (req, res) => {
  const result = await branchService.getBusinessBranches(
    req.params.businessId,
    req.user,
    req.query,
  );
  return sendSuccess(res, result);
});

const updateBranch = asyncHandler(async (req, res) => {
  const result = await branchService.updateBranch(
    req.params.id,
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const deleteBranch = asyncHandler(async (req, res) => {
  const result = await branchService.deleteBranch(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const updateBranchStatus = asyncHandler(async (req, res) => {
  const result = await branchService.updateBranchStatus(
    req.params.id,
    req.body.status,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const setMainBranch = asyncHandler(async (req, res) => {
  const result = await branchService.setMainBranch(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await branchService.getDashboardStats();
  return sendSuccess(res, { stats });
});

// TODO: File upload endpoints
const uploadBranchImage = asyncHandler(async (req, res) => {
  return sendSuccess(res, { message: 'Upload branch image endpoint' });
});

const uploadBranchCoverImage = asyncHandler(async (req, res) => {
  return sendSuccess(res, { message: 'Upload branch cover image endpoint' });
});

module.exports = {
  createBranch,
  getBranches,
  getBranchById,
  getBusinessBranches,
  updateBranch,
  deleteBranch,
  updateBranchStatus,
  setMainBranch,
  getDashboardStats,
  uploadBranchImage,
  uploadBranchCoverImage,
};
