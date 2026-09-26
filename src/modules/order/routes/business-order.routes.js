/**
 * Business order routes.
 * Business-facing APIs for managing sub-orders.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  getBusinessOrders,
  getTodayBusinessOrders,
  getBusinessDashboard,
  acceptBusinessOrder,
  rejectBusinessOrder,
  preparingBusinessOrder,
  readyBusinessOrder,
  deliveredBusinessOrder,
  getAvailableDrivers,
  assignDriver,
} = require('../controllers/order.controller');
const {
  getBusinessOrderQRs,
  scanOrderQR,
} = require('../controllers/order-qr.controller');
const {
  listBusinessOrdersSchema,
  rejectOrderSchema,
  assignDriverSchema,
  availableDriversSchema,
} = require('../validators/order.validator');
const { scanOrderQRSchema } = require('../validators/order-qr.validator');
const { ROLES } = require('../../../constants');

const businessRoles = [
  ROLES.SUPER_ADMIN,
  ROLES.BUSINESS_OWNER,
  ROLES.BUSINESS_MANAGER,
  ROLES.SUPPORT_ADMIN,
  ROLES.FINANCE_ADMIN,
];

const writeRoles = [ROLES.SUPER_ADMIN, ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER];

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Business Orders
 *     description: Business-facing order management for CoreSY Go
 */

/**
 * @swagger
 * /business/orders/dashboard:
 *   get:
 *     summary: Business order dashboard stats
 *     tags: [Business Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Dashboard stats
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 stats:
 *                   todaysOrders: 15
 *                   pending: 3
 *                   accepted: 2
 *                   preparing: 4
 *                   ready: 2
 *                   completed: 3
 *                   cancelled: 1
 */
router.get('/dashboard', authorizeRoles(...businessRoles), getBusinessDashboard);

/**
 * @swagger
 * /business/orders/today:
 *   get:
 *     summary: Get today's business orders
 *     tags: [Business Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Today's orders
 */
router.get(
  '/today',
  authorizeRoles(...businessRoles),
  validate({ query: listBusinessOrdersSchema }),
  getTodayBusinessOrders,
);

/**
 * @swagger
 * /business/orders:
 *   get:
 *     summary: List business sub-orders
 *     tags: [Business Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: fulfillmentType
 *         schema:
 *           type: string
 *           enum: [DELIVERY, PICKUP]
 *     responses:
 *       200:
 *         description: Business orders retrieved
 */
router.get(
  '/',
  authorizeRoles(...businessRoles),
  validate({ query: listBusinessOrdersSchema }),
  getBusinessOrders,
);

/**
 * @swagger
 * /business/orders/available-drivers:
 *   get:
 *     summary: List online drivers available for assignment
 *     tags: [Business Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: governorateId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: businessOrderId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Uses delivery address governorate from this order when set
 *     responses:
 *       200:
 *         description: Available drivers
 */
router.get(
  '/available-drivers',
  authorizeRoles(...writeRoles),
  validate({ query: availableDriversSchema }),
  getAvailableDrivers,
);

/**
 * @swagger
 * /business/orders/scan-qr:
 *   post:
 *     summary: Business scans pickup handover QR
 *     tags: [Business Orders]
 */
router.post(
  '/scan-qr',
  authorizeRoles(...writeRoles),
  validate({ body: scanOrderQRSchema }),
  scanOrderQR,
);

/**
 * @swagger
 * /business/orders/{id}/assign-driver:
 *   patch:
 *     summary: Assign a driver to a DELIVERY business order
 *     description: Call after business accepts (status ACCEPTED / PREPARING / READY). Driver then sees the order and can accept or decline.
 *     tags: [Business Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [driverId]
 *             properties:
 *               driverId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Driver assigned; status becomes ASSIGNED
 */
router.patch(
  '/:id/assign-driver',
  authorizeRoles(...writeRoles),
  validate({ body: assignDriverSchema }),
  assignDriver,
);

/**
 * @swagger
 * /business/orders/{id}/qrs:
 *   get:
 *     summary: List order QRs for a business order (includes driver pickup QR)
 *     tags: [Business Orders]
 */
router.get('/:id/qrs', authorizeRoles(...businessRoles), getBusinessOrderQRs);

/**
 * @swagger
 * /business/orders/{id}/accept:
 *   patch:
 *     summary: Accept a business order
 *     tags: [Business Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         example: a7f11770-5f94-445d-bd33-307cdba8f600
 *         description: Business order ID
 *     responses:
 *       200:
 *         description: Order accepted
 */
router.patch('/:id/accept', authorizeRoles(...writeRoles), acceptBusinessOrder);

/**
 * @swagger
 * /business/orders/{id}/reject:
 *   patch:
 *     summary: Reject a business order
 *     tags: [Business Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         example: a7f11770-5f94-445d-bd33-307cdba8f600
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 nullable: true
 *           example:
 *             reason: Item unavailable
 *     responses:
 *       200:
 *         description: Order rejected
 */
router.patch(
  '/:id/reject',
  authorizeRoles(...writeRoles),
  validate({ body: rejectOrderSchema }),
  rejectBusinessOrder,
);

/**
 * @swagger
 * /business/orders/{id}/preparing:
 *   patch:
 *     summary: Mark business order as preparing
 *     tags: [Business Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         example: a7f11770-5f94-445d-bd33-307cdba8f600
 *     responses:
 *       200:
 *         description: Order marked as preparing
 */
router.patch('/:id/preparing', authorizeRoles(...writeRoles), preparingBusinessOrder);

/**
 * @swagger
 * /business/orders/{id}/ready:
 *   patch:
 *     summary: Mark business order as ready
 *     tags: [Business Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         example: a7f11770-5f94-445d-bd33-307cdba8f600
 *     responses:
 *       200:
 *         description: Order marked as ready
 */
router.patch('/:id/ready', authorizeRoles(...writeRoles), readyBusinessOrder);

/**
 * @swagger
 * /business/orders/{id}/delivered:
 *   patch:
 *     summary: Mark business order as delivered / collected (pickup)
 *     description: For PICKUP orders use this after customer collects when status is READY. Also allowed from ON_THE_WAY / PICKED_UP for delivery.
 *     tags: [Business Orders]
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
 *         description: Order marked as delivered / collected
 */
router.patch('/:id/delivered', authorizeRoles(...writeRoles), deliveredBusinessOrder);

module.exports = router;
