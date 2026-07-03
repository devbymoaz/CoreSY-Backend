/**
 * Wallet controller.
 */

const walletService = require('../services/wallet.service');
const { sendSuccess } = require('../../../helpers/response.helper');
const asyncHandler = require('../../../utils/asyncHandler');

const getWallet = asyncHandler(async (req, res) => {
  const result = await walletService.getWallet(req.user);
  return sendSuccess(res, result);
});

const getBalance = asyncHandler(async (req, res) => {
  const balance = await walletService.getBalance(req.user);
  return sendSuccess(res, { balance });
});

const getHistory = asyncHandler(async (req, res) => {
  const result = await walletService.getHistory(req.query, req.user);
  return sendSuccess(res, result);
});

const getTransactions = asyncHandler(async (req, res) => {
  const result = await walletService.getTransactions(req.query, req.user);
  return sendSuccess(res, result);
});

const topUp = asyncHandler(async (req, res) => {
  const result = await walletService.topUp(req.body, req.user, req.ip, req.headers['user-agent']);
  return sendSuccess(res, result);
});

const withdraw = asyncHandler(async (req, res) => {
  const result = await walletService.withdraw(
    req.body,
    req.user,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const transfer = asyncHandler(async (req, res) => {
  const result = await walletService.transfer(
    req.body,
    req.user,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const getCustomerDashboard = asyncHandler(async (req, res) => {
  const stats = await walletService.getCustomerDashboard(req.user);
  return sendSuccess(res, { stats });
});

const getWallets = asyncHandler(async (req, res) => {
  const result = await walletService.getWallets(req.query, req.user);
  return sendSuccess(res, result);
});

const getWalletById = asyncHandler(async (req, res) => {
  const wallet = await walletService.getWalletById(req.params.id, req.user);
  return sendSuccess(res, { wallet });
});

const freezeWallet = asyncHandler(async (req, res) => {
  const result = await walletService.freezeWallet(
    req.params.id || req.body.walletId,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const unfreezeWallet = asyncHandler(async (req, res) => {
  const result = await walletService.unfreezeWallet(
    req.params.id || req.body.walletId,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const adjustWallet = asyncHandler(async (req, res) => {
  const result = await walletService.adjustWallet(
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const getAdminDashboard = asyncHandler(async (req, res) => {
  const stats = await walletService.getAdminDashboard(req.user);
  return sendSuccess(res, { stats });
});

module.exports = {
  getWallet,
  getBalance,
  getHistory,
  getTransactions,
  topUp,
  withdraw,
  transfer,
  getCustomerDashboard,
  getWallets,
  getWalletById,
  freezeWallet,
  unfreezeWallet,
  adjustWallet,
  getAdminDashboard,
};
