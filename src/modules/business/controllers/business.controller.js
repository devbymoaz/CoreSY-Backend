const businessService = require('../services/business.service');
const { sendSuccess, sendCreated } = require('../../../../src/helpers/response.helper');
const asyncHandler = require('../../../../src/utils/asyncHandler');

const createBusiness = asyncHandler(async (req, res) => {
  const result = await businessService.createBusiness(
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendCreated(res, result);
});

const getBusinesses = asyncHandler(async (req, res) => {
  const result = await businessService.getBusinesses(req.query, req.user);
  return sendSuccess(res, result);
});

const getBusinessById = asyncHandler(async (req, res) => {
  const business = await businessService.getBusinessById(req.params.id, req.user);
  return sendSuccess(res, { business });
});

const getMyBusinesses = asyncHandler(async (req, res) => {
  const result = await businessService.getMyBusinesses(req.user.id, req.query);
  return sendSuccess(res, result);
});

const updateBusiness = asyncHandler(async (req, res) => {
  const result = await businessService.updateBusiness(
    req.params.id,
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const deleteBusiness = asyncHandler(async (req, res) => {
  const result = await businessService.deleteBusiness(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const updateBusinessStatus = asyncHandler(async (req, res) => {
  const result = await businessService.updateBusinessStatus(
    req.params.id,
    req.body.status,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const approveBusiness = asyncHandler(async (req, res) => {
  const result = await businessService.approveBusiness(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const rejectBusiness = asyncHandler(async (req, res) => {
  const result = await businessService.rejectBusiness(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await businessService.getDashboardStats();
  return sendSuccess(res, { stats });
});

// TODO: Add file upload endpoints
const uploadLogo = asyncHandler(async (req, res) => {
  // To be implemented
  return sendSuccess(res, { message: 'Upload logo endpoint' });
});

const uploadCoverImage = asyncHandler(async (req, res) => {
  // To be implemented
  return sendSuccess(res, { message: 'Upload cover image endpoint' });
});

module.exports = {
  createBusiness,
  getBusinesses,
  getBusinessById,
  getMyBusinesses,
  updateBusiness,
  deleteBusiness,
  updateBusinessStatus,
  approveBusiness,
  rejectBusiness,
  getDashboardStats,
  uploadLogo,
  uploadCoverImage,
};
