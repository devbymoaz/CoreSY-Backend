/**
 * Order QR controller.
 */

const orderQRService = require('../services/order-qr.service');
const { sendSuccess, sendCreated } = require('../../../helpers/response.helper');
const asyncHandler = require('../../../utils/asyncHandler');

const getOrderQRs = asyncHandler(async (req, res) => {
  const result = await orderQRService.getByOrderId(req.params.orderId, req.user);
  return sendSuccess(res, result);
});

const getBusinessOrderQRs = asyncHandler(async (req, res) => {
  const actor = req.driver
    ? { id: req.driver.id, driverId: req.driver.id, roles: ['DRIVER'] }
    : req.user;
  const result = await orderQRService.getByBusinessOrderId(req.params.id, actor);
  return sendSuccess(res, result);
});

const getOrderQRByToken = asyncHandler(async (req, res) => {
  const result = await orderQRService.getByToken(req.params.token);
  return sendSuccess(res, result);
});

const scanOrderQR = asyncHandler(async (req, res) => {
  const actor = req.driver
    ? { id: req.driver.id, driverId: req.driver.id, roles: ['DRIVER'] }
    : req.user;
  const result = await orderQRService.scan(
    req.body.token,
    actor,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const payOrderQR = asyncHandler(async (req, res) => {
  const result = await orderQRService.pay(
    req.params.token,
    req.body,
    req.user,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const createDeliveryPaymentQR = asyncHandler(async (req, res) => {
  const result = await orderQRService.ensureDeliveryPaymentQR(req.params.id, req.driver);
  return sendCreated(res, result);
});

module.exports = {
  getOrderQRs,
  getBusinessOrderQRs,
  getOrderQRByToken,
  scanOrderQR,
  payOrderQR,
  createDeliveryPaymentQR,
};
