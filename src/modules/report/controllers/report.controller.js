/**
 * Report controller.
 */

const reportService = require('../services/report.service');
const { sendSuccess } = require('../../../helpers/response.helper');
const asyncHandler = require('../../../utils/asyncHandler');

const getDashboard = asyncHandler(async (req, res) => {
  const result = await reportService.getDashboard(req.query, req.user);
  return sendSuccess(res, result);
});

const getRevenue = asyncHandler(async (req, res) => {
  const result = await reportService.getRevenueReport(req.query, req.user);
  return sendSuccess(res, { report: result });
});

const getBookings = asyncHandler(async (req, res) => {
  const result = await reportService.getBookingsReport(req.query, req.user);
  return sendSuccess(res, { report: result });
});

const getOrders = asyncHandler(async (req, res) => {
  const result = await reportService.getOrdersReport(req.query, req.user);
  return sendSuccess(res, { report: result });
});

const getPayments = asyncHandler(async (req, res) => {
  const result = await reportService.getPaymentsReport(req.query, req.user);
  return sendSuccess(res, { report: result });
});

const getWallet = asyncHandler(async (req, res) => {
  const result = await reportService.getWalletReport(req.query, req.user);
  return sendSuccess(res, { report: result });
});

const getDrivers = asyncHandler(async (req, res) => {
  const result = await reportService.getDriversReport(req.query, req.user);
  return sendSuccess(res, { report: result });
});

const getCustomers = asyncHandler(async (req, res) => {
  const result = await reportService.getCustomersReport(req.query, req.user);
  return sendSuccess(res, { report: result });
});

const getBusinesses = asyncHandler(async (req, res) => {
  const result = await reportService.getBusinessesReport(req.query, req.user);
  return sendSuccess(res, { report: result });
});

const exportReport = asyncHandler(async (req, res) => {
  const result = await reportService.exportReport(req.query, req.user);
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  return res.status(200).send(result.content);
});

module.exports = {
  getDashboard,
  getRevenue,
  getBookings,
  getOrders,
  getPayments,
  getWallet,
  getDrivers,
  getCustomers,
  getBusinesses,
  exportReport,
};
