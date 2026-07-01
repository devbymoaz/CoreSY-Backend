const bookingService = require('../services/booking.service');
const { sendSuccess, sendCreated } = require('../../../helpers/response.helper');
const asyncHandler = require('../../../utils/asyncHandler');

const createBooking = asyncHandler(async (req, res) => {
  const result = await bookingService.createBooking(
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendCreated(res, result);
});

const getBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.getBookings(req.query, req.user);
  return sendSuccess(res, result);
});

const getBookingById = asyncHandler(async (req, res) => {
  const result = await bookingService.getBookingById(req.params.id, req.user);
  return sendSuccess(res, result);
});

const updateBooking = asyncHandler(async (req, res) => {
  const result = await bookingService.updateBooking(
    req.params.id,
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const cancelBooking = asyncHandler(async (req, res) => {
  const result = await bookingService.cancelBooking(
    req.params.id,
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const rescheduleBooking = asyncHandler(async (req, res) => {
  const result = await bookingService.rescheduleBooking(
    req.params.id,
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const getUpcomingBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.getUpcomingBookings(req.user.id, req.query);
  return sendSuccess(res, result);
});

const getBookingHistory = asyncHandler(async (req, res) => {
  const result = await bookingService.getBookingHistory(req.user.id, req.query);
  return sendSuccess(res, result);
});

const getBusinessBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.getBusinessBookings(req.query, req.user);
  return sendSuccess(res, result);
});

const getBusinessTodayBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.getBusinessTodayBookings(
    req.params.businessId,
    req.query,
    req.user,
  );
  return sendSuccess(res, result);
});

const getBusinessUpcomingBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.getBusinessUpcomingBookings(
    req.params.businessId,
    req.query,
    req.user,
  );
  return sendSuccess(res, result);
});

const confirmBooking = asyncHandler(async (req, res) => {
  const result = await bookingService.confirmBooking(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const rejectBooking = asyncHandler(async (req, res) => {
  const result = await bookingService.rejectBooking(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const generateQRCode = asyncHandler(async (req, res) => {
  const result = await bookingService.generateQRCode(req.params.id, req.user.id, req.user);
  return sendSuccess(res, result);
});

const addFavorite = asyncHandler(async (req, res) => {
  const result = await bookingService.addFavorite(
    req.user.id,
    req.params.businessId,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const removeFavorite = asyncHandler(async (req, res) => {
  const result = await bookingService.removeFavorite(
    req.user.id,
    req.params.businessId,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const getFavorites = asyncHandler(async (req, res) => {
  const result = await bookingService.getFavorites(req.user.id, req.query);
  return sendSuccess(res, result);
});

const getCustomerDashboard = asyncHandler(async (req, res) => {
  const result = await bookingService.getCustomerDashboard(req.user.id);
  return sendSuccess(res, { stats: result });
});

const getBusinessDashboard = asyncHandler(async (req, res) => {
  const result = await bookingService.getBusinessDashboard(req.params.businessId, req.user);
  return sendSuccess(res, { stats: result });
});

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  rescheduleBooking,
  getUpcomingBookings,
  getBookingHistory,
  getBusinessBookings,
  getBusinessTodayBookings,
  getBusinessUpcomingBookings,
  confirmBooking,
  rejectBooking,
  generateQRCode,
  addFavorite,
  removeFavorite,
  getFavorites,
  getCustomerDashboard,
  getBusinessDashboard,
};
