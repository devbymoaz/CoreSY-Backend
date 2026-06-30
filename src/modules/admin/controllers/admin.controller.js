const adminService = require('../services/admin.service');
const { sendSuccess, sendCreated } = require('../../../helpers/response.helper');
const asyncHandler = require('../../../utils/asyncHandler');

const createAdmin = asyncHandler(async (req, res) => {
  const result = await adminService.createAdmin(
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendCreated(res, result);
});

const getAdmins = asyncHandler(async (req, res) => {
  const result = await adminService.getAdmins(req.query);
  return sendSuccess(res, result);
});

const getAdminById = asyncHandler(async (req, res) => {
  const admin = await adminService.getAdminById(req.params.id);
  return sendSuccess(res, { admin });
});

const updateAdmin = asyncHandler(async (req, res) => {
  const result = await adminService.updateAdmin(
    req.params.id,
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const deleteAdmin = asyncHandler(async (req, res) => {
  const result = await adminService.deleteAdmin(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const updateAdminStatus = asyncHandler(async (req, res) => {
  const result = await adminService.updateAdminStatus(
    req.params.id,
    req.body.status,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const resetAdminPassword = asyncHandler(async (req, res) => {
  const result = await adminService.resetAdminPassword(
    req.params.id,
    req.body.newPassword,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const getOwnProfile = asyncHandler(async (req, res) => {
  const admin = await adminService.getOwnProfile(req.user.id);
  return sendSuccess(res, { admin });
});

const updateOwnProfile = asyncHandler(async (req, res) => {
  const result = await adminService.updateOwnProfile(
    req.user.id,
    req.body,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const getDashboard = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboard();
  return sendSuccess(res, { stats });
});

const getNotifications = asyncHandler(async (req, res) => {
  const result = await adminService.getNotifications(req.user.id);
  return sendSuccess(res, result);
});

module.exports = {
  createAdmin,
  getAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  updateAdminStatus,
  resetAdminPassword,
  getOwnProfile,
  updateOwnProfile,
  getDashboard,
  getNotifications,
};
