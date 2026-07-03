/**
 * Order controller.
 * Thin HTTP layer for CoreSY Go order management.
 */

const orderService = require('../services/order.service');
const { sendSuccess, sendCreated } = require('../../../helpers/response.helper');
const asyncHandler = require('../../../utils/asyncHandler');

const createOrder = asyncHandler(async (req, res) => {
  const result = await orderService.createOrder(
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendCreated(res, result);
});

const getOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getOrders(req.query, req.user);
  return sendSuccess(res, result);
});

const getOrderHistory = asyncHandler(async (req, res) => {
  const result = await orderService.getOrderHistory(req.query, req.user);
  return sendSuccess(res, result);
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id, req.user);
  return sendSuccess(res, { order });
});

const trackOrder = asyncHandler(async (req, res) => {
  const tracking = await orderService.trackOrder(req.params.id, req.user);
  return sendSuccess(res, { tracking });
});

const getInvoice = asyncHandler(async (req, res) => {
  const result = await orderService.getInvoice(req.params.id, req.user);
  return sendSuccess(res, result);
});

const cancelOrder = asyncHandler(async (req, res) => {
  const result = await orderService.cancelOrder(
    req.params.id,
    req.body.reason,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const reorder = asyncHandler(async (req, res) => {
  const result = await orderService.reorder(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendCreated(res, result);
});

const getCustomerDashboard = asyncHandler(async (req, res) => {
  const stats = await orderService.getCustomerDashboard(req.user);
  return sendSuccess(res, { stats });
});

const getBusinessOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getBusinessOrders(req.query, req.user);
  return sendSuccess(res, result);
});

const getTodayBusinessOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getTodayBusinessOrders(req.query, req.user);
  return sendSuccess(res, result);
});

const getBusinessDashboard = asyncHandler(async (req, res) => {
  const stats = await orderService.getBusinessDashboard(req.query, req.user);
  return sendSuccess(res, { stats });
});

const acceptBusinessOrder = asyncHandler(async (req, res) => {
  const result = await orderService.acceptBusinessOrder(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const rejectBusinessOrder = asyncHandler(async (req, res) => {
  const result = await orderService.rejectBusinessOrder(
    req.params.id,
    req.body.reason,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const preparingBusinessOrder = asyncHandler(async (req, res) => {
  const result = await orderService.preparingBusinessOrder(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const readyBusinessOrder = asyncHandler(async (req, res) => {
  const result = await orderService.readyBusinessOrder(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

module.exports = {
  createOrder,
  getOrders,
  getOrderHistory,
  getOrderById,
  trackOrder,
  getInvoice,
  cancelOrder,
  reorder,
  getCustomerDashboard,
  getBusinessOrders,
  getTodayBusinessOrders,
  getBusinessDashboard,
  acceptBusinessOrder,
  rejectBusinessOrder,
  preparingBusinessOrder,
  readyBusinessOrder,
};
