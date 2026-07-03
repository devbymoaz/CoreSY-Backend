/**
 * Notification routes.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  broadcast,
  retryFailed,
  getDashboard,
} = require('../controllers/notification.controller');
const {
  listNotificationsSchema,
  markReadSchema,
  broadcastSchema,
} = require('../validators/notification.validator');
const { ROLES } = require('../../../constants');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Notifications
 *     description: Multi-channel notification management
 */

/**
 * @swagger
 * /notifications/dashboard:
 *   get:
 *     summary: Notification dashboard stats
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
router.get('/dashboard', getDashboard);

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: List notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *           enum: [PUSH, EMAIL, SMS, WHATSAPP, IN_APP]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *       - in: query
 *         name: deliveryStatus
 *         schema:
 *           type: string
 *           enum: [PENDING, QUEUED, SENT, DELIVERED, FAILED, READ]
 *       - in: query
 *         name: module
 *         schema:
 *           type: string
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Notifications list
 */
router.get('/', validate({ query: listNotificationsSchema }), getNotifications);

/**
 * @swagger
 * /notifications/read:
 *   patch:
 *     summary: Mark notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             ids:
 *               - 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: Marked as read
 */
router.patch('/read', validate({ body: markReadSchema }), markAsRead);

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All marked as read
 */
router.patch('/read-all', markAllAsRead);

/**
 * @swagger
 * /notifications/broadcast:
 *   post:
 *     summary: Broadcast notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             title: System Maintenance
 *             message: CoreSY will be under maintenance tonight.
 *             channels: [IN_APP, PUSH]
 *             priority: HIGH
 *             allUsers: true
 *     responses:
 *       200:
 *         description: Broadcast sent
 */
router.post(
  '/broadcast',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.SUPPORT_ADMIN),
  validate({ body: broadcastSchema }),
  broadcast,
);

/**
 * @swagger
 * /notifications/retry:
 *   post:
 *     summary: Retry failed notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Failed notifications retried
 */
router.post('/retry', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.SUPPORT_ADMIN), retryFailed);

/**
 * @swagger
 * /notifications/{id}:
 *   get:
 *     summary: Get notification by ID
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Notification details
 */
router.get('/:id', getNotificationById);

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Notification deleted
 */
router.delete('/:id', deleteNotification);

module.exports = router;
