const qrService = require('../services/qr.service');
const { sendSuccess, sendCreated } = require('../../../helpers/response.helper');
const asyncHandler = require('../../../utils/asyncHandler');

const generateQR = asyncHandler(async (req, res) => {
  const result = await qrService.generateQR(
    req.params.bookingId,
    req.user.id,
    req.user
  );
  return sendSuccess(res, result);
});

const getQRByBookingId = asyncHandler(async (req, res) => {
  const result = await qrService.getQRByBookingId(
    req.params.bookingId,
    req.user
  );
  return sendSuccess(res, result);
});

const getQRByQrId = asyncHandler(async (req, res) => {
  const result = await qrService.getQRByQrId(
    req.params.qrId,
    req.user
  );
  return sendSuccess(res, result);
});

const validateQR = asyncHandler(async (req, res) => {
  const result = await qrService.validateQR(
    req.body.token,
    req.user
  );
  return sendSuccess(res, result);
});

const scanQR = asyncHandler(async (req, res) => {
  const result = await qrService.scanQR(
    req.body.token,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user
  );
  return sendSuccess(res, result);
});

const checkIn = asyncHandler(async (req, res) => {
  const result = await qrService.checkIn(
    req.params.qrId,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user
  );
  return sendSuccess(res, result);
});

const checkOut = asyncHandler(async (req, res) => {
  const result = await qrService.checkOut(
    req.params.qrId,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user
  );
  return sendSuccess(res, result);
});

const cancelQR = asyncHandler(async (req, res) => {
  const result = await qrService.cancelQR(
    req.params.qrId,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user
  );
  return sendSuccess(res, result);
});

const getAllQRs = asyncHandler(async (req, res) => {
  const result = await qrService.getAllQRs(req.query, req.user);
  return sendSuccess(res, result);
});

const getCustomerDashboard = asyncHandler(async (req, res) => {
  const result = await qrService.getCustomerDashboard(req.user.id);
  return sendSuccess(res, { stats: result });
});

const getBusinessDashboard = asyncHandler(async (req, res) => {
  const result = await qrService.getBusinessDashboard(
    req.params.businessId,
    req.user
  );
  return sendSuccess(res, { stats: result });
});

const getCashierDashboard = asyncHandler(async (req, res) => {
  const result = await qrService.getCashierDashboard(req.user.id);
  return sendSuccess(res, { stats: result });
});

module.exports = {
  generateQR,
  getQRByBookingId,
  getQRByQrId,
  validateQR,
  scanQR,
  checkIn,
  checkOut,
  cancelQR,
  getAllQRs,
  getCustomerDashboard,
  getBusinessDashboard,
  getCashierDashboard,
};
