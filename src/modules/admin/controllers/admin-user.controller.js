/**
 * Admin user management controller.
 */

const adminUserService = require('../services/admin-user.service');
const { sendSuccess } = require('../../../helpers/response.helper');
const asyncHandler = require('../../../utils/asyncHandler');

const listUsers = asyncHandler(async (req, res) => {
  const result = await adminUserService.listUsers(req.query);
  return sendSuccess(res, result);
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await adminUserService.getUserById(req.params.id);
  return sendSuccess(res, { user });
});

const updateUser = asyncHandler(async (req, res) => {
  const result = await adminUserService.updateUser(
    req.params.id,
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const activateUser = asyncHandler(async (req, res) => {
  const result = await adminUserService.activateUser(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const deactivateUser = asyncHandler(async (req, res) => {
  const result = await adminUserService.deactivateUser(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const resendActivation = asyncHandler(async (req, res) => {
  const result = await adminUserService.resendActivation(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const banUser = asyncHandler(async (req, res) => {
  const result = await adminUserService.banUser(
    req.params.id,
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const unbanUser = asyncHandler(async (req, res) => {
  const result = await adminUserService.unbanUser(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const getUserHistory = asyncHandler(async (req, res) => {
  const result = await adminUserService.getUserHistory(req.params.id, req.query);
  return sendSuccess(res, result);
});

module.exports = {
  listUsers,
  getUserById,
  updateUser,
  activateUser,
  deactivateUser,
  resendActivation,
  banUser,
  unbanUser,
  getUserHistory,
};
