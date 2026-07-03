/**
 * Points controller.
 */

const pointsService = require('../services/points.service');
const { sendSuccess } = require('../../../helpers/response.helper');
const asyncHandler = require('../../../utils/asyncHandler');

const getPoints = asyncHandler(async (req, res) => {
  const result = await pointsService.getPoints(req.user);
  return sendSuccess(res, result);
});

const getBalance = asyncHandler(async (req, res) => {
  const balance = await pointsService.getBalance(req.user);
  return sendSuccess(res, { balance });
});

const getHistory = asyncHandler(async (req, res) => {
  const result = await pointsService.getHistory(req.query, req.user);
  return sendSuccess(res, result);
});

const redeem = asyncHandler(async (req, res) => {
  const result = await pointsService.redeem(req.body, req.user, req.ip, req.headers['user-agent']);
  return sendSuccess(res, result);
});

const getCustomerDashboard = asyncHandler(async (req, res) => {
  const stats = await pointsService.getCustomerDashboard(req.user);
  return sendSuccess(res, { stats });
});

const getAccounts = asyncHandler(async (req, res) => {
  const result = await pointsService.getAccounts(req.query, req.user);
  return sendSuccess(res, result);
});

const adjust = asyncHandler(async (req, res) => {
  const result = await pointsService.adjust(
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const expirePoints = asyncHandler(async (req, res) => {
  const result = await pointsService.expirePoints(
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const updateRules = asyncHandler(async (req, res) => {
  const result = await pointsService.updateRules(
    req.body.rules,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const getRules = asyncHandler(async (req, res) => {
  const rules = await pointsService.getRules(req.user);
  return sendSuccess(res, { rules });
});

const getAdminDashboard = asyncHandler(async (req, res) => {
  const stats = await pointsService.getAdminDashboard(req.user);
  return sendSuccess(res, { stats });
});

module.exports = {
  getPoints,
  getBalance,
  getHistory,
  redeem,
  getCustomerDashboard,
  getAccounts,
  adjust,
  expirePoints,
  updateRules,
  getRules,
  getAdminDashboard,
};
