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
} = require('../controllers/order.controller');
const { listBusinessOrdersSchema, rejectOrderSchema } = require('../validators/order.validator');
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
 *     requestBody:
 *       content:
 *         application/json:
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
 *     responses:
 *       200:
 *         description: Order marked as ready
 */
router.patch('/:id/ready', authorizeRoles(...writeRoles), readyBusinessOrder);

module.exports = router;
