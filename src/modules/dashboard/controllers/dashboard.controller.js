/**
 * Admin dashboard controller.
 */

const dashboardService = require('../services/dashboard.service');
const { sendSuccess } = require('../../../helpers/response.helper');
const asyncHandler = require('../../../utils/asyncHandler');

const getOverview = asyncHandler(async (req, res) => {
  const result = await dashboardService.getOverview(req.query, req.user);
  return sendSuccess(res, result);
});

const getFinancial = asyncHandler(async (req, res) => {
  const result = await dashboardService.getFinancial(req.query, req.user);
  return sendSuccess(res, result);
});

const getBookings = asyncHandler(async (req, res) => {
  const result = await dashboardService.getBookings(req.query, req.user);
  return sendSuccess(res, result);
});

const getOrders = asyncHandler(async (req, res) => {
  const result = await dashboardService.getOrders(req.query, req.user);
  return sendSuccess(res, result);
});

const getPayments = asyncHandler(async (req, res) => {
  const result = await dashboardService.getPayments(req.query, req.user);
  return sendSuccess(res, result);
});

const getBusinesses = asyncHandler(async (req, res) => {
  const result = await dashboardService.getBusinesses(req.query, req.user);
  return sendSuccess(res, result);
});

const getCustomers = asyncHandler(async (req, res) => {
  const result = await dashboardService.getCustomers(req.query, req.user);
  return sendSuccess(res, result);
});

const getDrivers = asyncHandler(async (req, res) => {
  const result = await dashboardService.getDrivers(req.query, req.user);
  return sendSuccess(res, result);
});

const getProducts = asyncHandler(async (req, res) => {
  const result = await dashboardService.getProducts(req.query, req.user);
  return sendSuccess(res, result);
});

const getReviews = asyncHandler(async (req, res) => {
  const result = await dashboardService.getReviews(req.query, req.user);
  return sendSuccess(res, result);
});

const getNotifications = asyncHandler(async (req, res) => {
  const result = await dashboardService.getNotifications(req.query, req.user);
  return sendSuccess(res, result);
});

const getCharts = asyncHandler(async (req, res) => {
  const result = await dashboardService.getCharts(req.query, req.user);
  return sendSuccess(res, result);
});

const getRecentActivities = asyncHandler(async (req, res) => {
  const result = await dashboardService.getRecentActivities(req.query, req.user);
  return sendSuccess(res, result);
});

const search = asyncHandler(async (req, res) => {
  const result = await dashboardService.search(req.query, req.user);
  return sendSuccess(res, result);
});

const exportDashboard = asyncHandler(async (req, res) => {
  const result = await dashboardService.exportDashboard(req.query, req.user);
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  return res.status(200).send(result.content);
});

module.exports = {
  getOverview,
  getFinancial,
  getBookings,
  getOrders,
  getPayments,
  getBusinesses,
  getCustomers,
  getDrivers,
  getProducts,
  getReviews,
  getNotifications,
  getCharts,
  getRecentActivities,
  search,
  exportDashboard,
};
