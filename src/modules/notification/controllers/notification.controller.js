/**
 * Notification controller.
 */

const notificationService = require('../services/notification.service');
const { sendSuccess } = require('../../../helpers/response.helper');
const asyncHandler = require('../../../utils/asyncHandler');

const getNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getNotifications(req.query, req.user);
  return sendSuccess(res, result);
});

const getNotificationById = asyncHandler(async (req, res) => {
  const notification = await notificationService.getNotificationById(req.params.id, req.user);
  return sendSuccess(res, { notification });
});

const markAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAsRead(req.body.ids, req.user.id, req.user);
  return sendSuccess(res, result);
});

const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id);
  return sendSuccess(res, result);
});

const deleteNotification = asyncHandler(async (req, res) => {
  const result = await notificationService.deleteNotification(req.params.id, req.user.id, req.user);
  return sendSuccess(res, result);
});

const broadcast = asyncHandler(async (req, res) => {
  const result = await notificationService.broadcast(
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const retryFailed = asyncHandler(async (req, res) => {
  const result = await notificationService.retryFailed(
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const getDashboard = asyncHandler(async (req, res) => {
  const stats = await notificationService.getDashboard(req.user);
  return sendSuccess(res, { stats });
});

module.exports = {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  broadcast,
  retryFailed,
  getDashboard,
};
