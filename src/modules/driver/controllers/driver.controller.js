/**
 * Driver controller.
 * Thin HTTP layer for CoreSY Go driver management.
 */

const driverService = require('../services/driver.service');
const { sendSuccess, sendCreated } = require('../../../helpers/response.helper');
const asyncHandler = require('../../../utils/asyncHandler');
const {
  buildPublicFileUrl,
  buildPublicFileUrls,
  removeUploadedFile,
  removeUploadedFiles,
} = require('../../../middlewares/upload.middleware');

const register = asyncHandler(async (req, res) => {
  const result = await driverService.register(req.body, req.ip, req.headers['user-agent']);
  return sendCreated(res, result);
});

const login = asyncHandler(async (req, res) => {
  const result = await driverService.login(req.body);
  return sendSuccess(res, result);
});

const getProfile = asyncHandler(async (req, res) => {
  const driver = await driverService.getProfile(req.driver.id);
  return sendSuccess(res, { driver });
});

const updateProfile = asyncHandler(async (req, res) => {
  const result = await driverService.updateProfile(
    req.driver.id,
    req.body,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const uploadDocuments = asyncHandler(async (req, res) => {
  const result = await driverService.uploadDocuments(
    req.driver.id,
    req.body,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const uploadVehicle = asyncHandler(async (req, res) => {
  const result = await driverService.uploadVehicle(
    req.driver.id,
    req.body,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const uploadDocumentFiles = asyncHandler(async (req, res) => {
  const uploadedFiles = Object.values(req.files || {}).flat();
  try {
    const data = {};
    for (const [field, files] of Object.entries(req.files || {})) {
      if (files[0]) data[field] = buildPublicFileUrl(req, files[0]);
    }
    const result = await driverService.uploadDocuments(
      req.driver.id,
      data,
      req.ip,
      req.headers['user-agent'],
    );
    return sendSuccess(res, result);
  } catch (error) {
    await removeUploadedFiles(uploadedFiles);
    throw error;
  }
});

const uploadVehicleFiles = asyncHandler(async (req, res) => {
  try {
    const result = await driverService.uploadVehicle(
      req.driver.id,
      {
        ...req.body,
        vehicleImages: buildPublicFileUrls(req, req.files),
      },
      req.ip,
      req.headers['user-agent'],
    );
    return sendSuccess(res, result);
  } catch (error) {
    await removeUploadedFiles(req.files);
    throw error;
  }
});

const uploadProfilePhoto = asyncHandler(async (req, res) => {
  try {
    const result = await driverService.uploadDocuments(
      req.driver.id,
      { profilePhoto: buildPublicFileUrl(req, req.file) },
      req.ip,
      req.headers['user-agent'],
    );
    return sendSuccess(res, result);
  } catch (error) {
    await removeUploadedFile(req.file);
    throw error;
  }
});

const updateAvailability = asyncHandler(async (req, res) => {
  const result = await driverService.updateAvailability(
    req.driver.id,
    req.body.availabilityStatus,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const updateLocation = asyncHandler(async (req, res) => {
  const result = await driverService.updateLocation(
    req.driver.id,
    req.body,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const getDriverDashboard = asyncHandler(async (req, res) => {
  const stats = await driverService.getDriverDashboard(req.driver.id);
  return sendSuccess(res, { stats });
});

const getHistory = asyncHandler(async (req, res) => {
  const history = await driverService.getHistory(req.driver.id);
  return sendSuccess(res, { history });
});

const getDrivers = asyncHandler(async (req, res) => {
  const result = await driverService.getDrivers(req.query, req.user);
  return sendSuccess(res, result);
});

const getDriverById = asyncHandler(async (req, res) => {
  const driver = await driverService.getDriverById(req.params.id, req.user);
  return sendSuccess(res, { driver });
});

const updateStatus = asyncHandler(async (req, res) => {
  const result = await driverService.updateStatus(
    req.params.id,
    req.body.status,
    req.body.reason,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const deleteDriver = asyncHandler(async (req, res) => {
  const result = await driverService.deleteDriver(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const getAdminDashboard = asyncHandler(async (req, res) => {
  const stats = await driverService.getDashboard(req.user);
  return sendSuccess(res, { stats });
});

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  uploadDocuments,
  uploadVehicle,
  uploadDocumentFiles,
  uploadVehicleFiles,
  uploadProfilePhoto,
  updateAvailability,
  updateLocation,
  getDriverDashboard,
  getHistory,
  getDrivers,
  getDriverById,
  updateStatus,
  deleteDriver,
  getAdminDashboard,
};
