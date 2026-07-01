const serviceService = require('../services/service.service');
const { sendSuccess, sendCreated } = require('../../../helpers/response.helper');
const asyncHandler = require('../../../utils/asyncHandler');

const createService = asyncHandler(async (req, res) => {
  const result = await serviceService.createService(
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendCreated(res, result);
});

const getServices = asyncHandler(async (req, res) => {
  const result = await serviceService.getServices(req.query, req.user);
  return sendSuccess(res, result);
});

const getServiceById = asyncHandler(async (req, res) => {
  const service = await serviceService.getServiceById(req.params.id, req.user);
  return sendSuccess(res, { service });
});

const getBusinessServices = asyncHandler(async (req, res) => {
  const result = await serviceService.getBusinessServices(
    req.params.businessId,
    req.user,
    req.query,
  );
  return sendSuccess(res, result);
});

const getBranchServices = asyncHandler(async (req, res) => {
  const result = await serviceService.getBranchServices(
    req.params.branchId,
    req.user,
    req.query,
  );
  return sendSuccess(res, result);
});

const updateService = asyncHandler(async (req, res) => {
  const result = await serviceService.updateService(
    req.params.id,
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const deleteService = asyncHandler(async (req, res) => {
  const result = await serviceService.deleteService(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const updateServiceStatus = asyncHandler(async (req, res) => {
  const result = await serviceService.updateServiceStatus(
    req.params.id,
    req.body.status,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const updateServiceFeatured = asyncHandler(async (req, res) => {
  const result = await serviceService.updateServiceFeatured(
    req.params.id,
    req.body.isFeatured,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await serviceService.getDashboardStats();
  return sendSuccess(res, { stats });
});

// TODO: Add file upload endpoints
const uploadServiceImage = asyncHandler(async (req, res) => {
  return sendSuccess(res, { message: 'Upload service image endpoint' });
});

const uploadServiceGallery = asyncHandler(async (req, res) => {
  return sendSuccess(res, { message: 'Upload service gallery endpoint' });
});

module.exports = {
  createService,
  getServices,
  getServiceById,
  getBusinessServices,
  getBranchServices,
  updateService,
  deleteService,
  updateServiceStatus,
  updateServiceFeatured,
  getDashboardStats,
  uploadServiceImage,
  uploadServiceGallery,
};
