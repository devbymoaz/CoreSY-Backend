/**
 * Authentication controller.
 * Thin HTTP layer - receives requests, delegates to service, returns responses.
 */

const authService = require('../services/auth.service');
const { sendSuccess, sendCreated } = require('../helpers/response.helper');
const asyncHandler = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return sendCreated(res, { message: result.message, data: result });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.body);
  return sendSuccess(res, { message: result.message, data: result });
});

const resendEmailVerification = asyncHandler(async (req, res) => {
  const result = await authService.resendEmailVerification(req.body);
  return sendSuccess(res, { message: result.message });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return sendSuccess(res, { message: result.message, data: result });
});

const refreshToken = asyncHandler(async (req, res) => {
  const result = await authService.refreshToken(req.body);
  return sendSuccess(res, { message: result.message, data: result });
});

const logout = asyncHandler(async (req, res) => {
  const result = await authService.logout(req.body);
  return sendSuccess(res, { message: result.message });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body);
  return sendSuccess(res, { message: result.message });
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  return sendSuccess(res, { message: result.message });
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user.id, req.body);
  return sendSuccess(res, { message: result.message });
});

const getProfile = asyncHandler(async (req, res) => {
  const result = await authService.getProfile(req.user.id);
  return sendSuccess(res, { data: result });
});

const updateProfile = asyncHandler(async (req, res) => {
  const result = await authService.updateProfile(req.user.id, req.body);
  return sendSuccess(res, { message: result.message, data: result });
});

module.exports = {
  register,
  verifyEmail,
  resendEmailVerification,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  updateProfile,
};
