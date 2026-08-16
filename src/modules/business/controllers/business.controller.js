const businessService = require('../services/business.service');
const { sendSuccess, sendCreated } = require('../../../helpers/response.helper');
const asyncHandler = require('../../../utils/asyncHandler');
const {
  buildPublicFileUrl,
  removeUploadedFile,
} = require('../../../middlewares/upload.middleware');

const createBusiness = asyncHandler(async (req, res) => {
  const result = await businessService.createBusiness(
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendCreated(res, {
    message: result.message,
    data: result.business,
  });
});

const getBusinesses = asyncHandler(async (req, res) => {
  const result = await businessService.getBusinesses(req.query, req.user);
  return sendSuccess(res, {
    message: 'Businesses retrieved successfully',
    data: result,
  });
});

const getBusinessById = asyncHandler(async (req, res) => {
  const business = await businessService.getBusinessById(req.params.id, req.user);
  return sendSuccess(res, {
    message: 'Business retrieved successfully',
    data: business,
  });
});

const getMyBusinesses = asyncHandler(async (req, res) => {
  const result = await businessService.getMyBusinesses(req.user.id, req.query);
  return sendSuccess(res, {
    message: 'Businesses retrieved successfully',
    data: result,
  });
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
  return sendSuccess(res, {
    message: result.message,
    data: result.business,
  });
});

const deleteBusiness = asyncHandler(async (req, res) => {
  const result = await businessService.deleteBusiness(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, {
    message: result.message,
    data: null,
  });
});

const updateBusinessStatus = asyncHandler(async (req, res) => {
  const result = await businessService.updateBusinessStatus(
    req.params.id,
    req.body.status,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, {
    message: result.message,
    data: result.business,
  });
});

const approveBusiness = asyncHandler(async (req, res) => {
  const result = await businessService.approveBusiness(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, {
    message: result.message,
    data: result.business,
  });
});

const rejectBusiness = asyncHandler(async (req, res) => {
  const result = await businessService.rejectBusiness(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, {
    message: result.message,
    data: result.business,
  });
});

const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await businessService.getDashboardStats();
  return sendSuccess(res, {
    message: 'Business dashboard stats retrieved successfully',
    data: stats,
  });
});

const uploadLogo = asyncHandler(async (req, res) => {
  try {
    const result = await businessService.uploadLogo(
      req.params.id,
      buildPublicFileUrl(req, req.file),
      req.user.id,
      req.ip,
      req.headers['user-agent'],
      req.user,
    );
    return sendSuccess(res, { message: result.message, data: result.business });
  } catch (error) {
    await removeUploadedFile(req.file);
    throw error;
  }
});

const uploadCoverImage = asyncHandler(async (req, res) => {
  try {
    const result = await businessService.uploadCoverImage(
      req.params.id,
      buildPublicFileUrl(req, req.file),
      req.user.id,
      req.ip,
      req.headers['user-agent'],
      req.user,
    );
    return sendSuccess(res, { message: result.message, data: result.business });
  } catch (error) {
    await removeUploadedFile(req.file);
    throw error;
  }
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
