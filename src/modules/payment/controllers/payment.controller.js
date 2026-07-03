/**
 * Payment controller.
 */

const paymentService = require('../services/payment.service');
const { sendSuccess, sendCreated } = require('../../../helpers/response.helper');
const asyncHandler = require('../../../utils/asyncHandler');

const createPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.createPayment(
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendCreated(res, result);
});

const getPayments = asyncHandler(async (req, res) => {
  const result = await paymentService.getPayments(req.query, req.user);
  return sendSuccess(res, result);
});

const getHistory = asyncHandler(async (req, res) => {
  const result = await paymentService.getHistory(req.query, req.user);
  return sendSuccess(res, result);
});

const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPaymentById(req.params.id, req.user);
  return sendSuccess(res, { payment });
});

const getInvoice = asyncHandler(async (req, res) => {
  const result = await paymentService.getInvoice(req.params.id, req.user);
  return sendSuccess(res, result);
});

const cancelPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.cancelPayment(
    req.params.id,
    req.body.reason,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const verifyPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.verifyPayment(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const refundPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.refundPayment(
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const getBusinessPayments = asyncHandler(async (req, res) => {
  const result = await paymentService.getBusinessPayments(req.query, req.user);
  return sendSuccess(res, result);
});

const getTodayBusinessPayments = asyncHandler(async (req, res) => {
  const result = await paymentService.getTodayBusinessPayments(req.query, req.user);
  return sendSuccess(res, result);
});

const getBusinessTransactions = asyncHandler(async (req, res) => {
  const result = await paymentService.getBusinessTransactions(req.query, req.user);
  return sendSuccess(res, result);
});

const getAdminPayments = asyncHandler(async (req, res) => {
  const result = await paymentService.getAdminPayments(req.query, req.user);
  return sendSuccess(res, result);
});

const getCustomerDashboard = asyncHandler(async (req, res) => {
  const stats = await paymentService.getCustomerDashboard(req.user);
  return sendSuccess(res, { stats });
});

const getBusinessDashboard = asyncHandler(async (req, res) => {
  const stats = await paymentService.getBusinessDashboard(req.query, req.user);
  return sendSuccess(res, { stats });
});

const getPlatformDashboard = asyncHandler(async (req, res) => {
  const stats = await paymentService.getPlatformDashboard(req.user);
  return sendSuccess(res, { stats });
});

module.exports = {
  createPayment,
  getPayments,
  getHistory,
  getPaymentById,
  getInvoice,
  cancelPayment,
  verifyPayment,
  refundPayment,
  getBusinessPayments,
  getTodayBusinessPayments,
  getBusinessTransactions,
  getAdminPayments,
  getCustomerDashboard,
  getBusinessDashboard,
  getPlatformDashboard,
};
