const cashierService = require('../services/cashier.service');
const { sendSuccess, sendCreated } = require('../../../helpers/response.helper');
const asyncHandler = require('../../../utils/asyncHandler');

const createCashier = asyncHandler(async (req, res) => {
  const result = await cashierService.createCashier(
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendCreated(res, result);
});

const getCashiers = asyncHandler(async (req, res) => {
  const result = await cashierService.getCashiers(req.query, req.user);
  return sendSuccess(res, result);
});

const getCashierById = asyncHandler(async (req, res) => {
  const cashier = await cashierService.getCashierById(req.params.id, req.user);
  return sendSuccess(res, { cashier });
});

const getBusinessCashiers = asyncHandler(async (req, res) => {
  const result = await cashierService.getBusinessCashiers(
    req.params.businessId,
    req.user,
    req.query,
  );
  return sendSuccess(res, result);
});

const getBranchCashiers = asyncHandler(async (req, res) => {
  const result = await cashierService.getBranchCashiers(
    req.params.branchId,
    req.user,
    req.query,
  );
  return sendSuccess(res, result);
});

const updateCashier = asyncHandler(async (req, res) => {
  const result = await cashierService.updateCashier(
    req.params.id,
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const deleteCashier = asyncHandler(async (req, res) => {
  const result = await cashierService.deleteCashier(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const updateCashierStatus = asyncHandler(async (req, res) => {
  const result = await cashierService.updateCashierStatus(
    req.params.id,
    req.body.status,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const resetCashierPassword = asyncHandler(async (req, res) => {
  const result = await cashierService.resetCashierPassword(
    req.params.id,
    req.body.newPassword,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const getCashierProfile = asyncHandler(async (req, res) => {
  const cashier = await cashierService.getCashierProfile(req.user.id);
  return sendSuccess(res, { cashier });
});

const updateCashierProfile = asyncHandler(async (req, res) => {
  const result = await cashierService.updateCashierProfile(
    req.user.id,
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const changeCashierPassword = asyncHandler(async (req, res) => {
  const result = await cashierService.changeCashierPassword(
    req.user.id,
    req.body.currentPassword,
    req.body.newPassword,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await cashierService.getDashboardStats();
  return sendSuccess(res, { stats });
});

const uploadProfileImage = asyncHandler(async (req, res) => {
  return sendSuccess(res, { message: 'Cashier profile image upload endpoint' });
});

module.exports = {
  createCashier,
  getCashiers,
  getCashierById,
  getBusinessCashiers,
  getBranchCashiers,
  updateCashier,
  deleteCashier,
  updateCashierStatus,
  resetCashierPassword,
  getCashierProfile,
  updateCashierProfile,
  changeCashierPassword,
  getDashboardStats,
  uploadProfileImage,
};
