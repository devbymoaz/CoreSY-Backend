/**
 * Customer and admin order routes.
 * CoreSY Go multi-vendor order management APIs.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  createOrder,
  getOrders,
  getOrderHistory,
  getOrderById,
  trackOrder,
  getInvoice,
  cancelOrder,
  reorder,
  getCustomerDashboard,
} = require('../controllers/order.controller');
const {
  createOrderSchema,
  cancelOrderSchema,
  listOrdersSchema,
} = require('../validators/order.validator');
const { ROLES } = require('../../../constants');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Orders
 *     description: CoreSY Go multi-vendor order management
 */

/**
 * @swagger
 * /orders/dashboard:
 *   get:
 *     summary: Customer order dashboard stats
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 stats:
 *                   totalOrders: 12
 *                   upcomingOrders: 2
 *                   completedOrders: 8
 *                   cancelledOrders: 2
 */
router.get('/dashboard', getCustomerDashboard);

/**
 * @swagger
 * /orders/history:
 *   get:
 *     summary: Get order history
 *     tags: [Orders]
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
 *     responses:
 *       200:
 *         description: Order history retrieved
 */
router.get('/history', validate({ query: listOrdersSchema }), getOrderHistory);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: List orders with search, filters, pagination
 *     tags: [Orders]
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
 *         description: Search by order number, customer, or business
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACCEPTED, PREPARING, READY, ASSIGNED, PICKED_UP, ON_THE_WAY, DELIVERED, CANCELLED, REJECTED, REFUNDED]
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [PENDING, PAID, FAILED, REFUNDED, CASH, WALLET]
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Orders retrieved
 */
router.get('/', validate({ query: listOrdersSchema }), getOrders);

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a multi-vendor order
 *     description: Products from multiple businesses are automatically split into business sub-orders under one master order.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             paymentMethod: CASH
 *             deliveryNotes: Please call on arrival
 *             deliveryAddress:
 *               customerName: Ahmad Al-Hassan
 *               phone: "+963912345678"
 *               governorateId: 550e8400-e29b-41d4-a716-446655440000
 *               area: Mazzeh
 *               street: Street 12
 *               building: Building 4
 *               floor: "2"
 *               apartment: "8"
 *               latitude: 33.5138
 *               longitude: 36.2765
 *             items:
 *               - productId: 550e8400-e29b-41d4-a716-446655440010
 *                 quantity: 2
 *               - productId: 550e8400-e29b-41d4-a716-446655440011
 *                 quantity: 1
 *     responses:
 *       201:
 *         description: Order created and split by business
 *       400:
 *         description: Validation or stock error
 */
router.post(
  '/',
  authorizeRoles(ROLES.USER, ROLES.SUPER_ADMIN),
  validate({ body: createOrderSchema }),
  createOrder,
);

/**
 * @swagger
 * /orders/{id}/track:
 *   get:
 *     summary: Track order status
 *     tags: [Orders]
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
 *         description: Tracking details
 */
router.get('/:id/track', trackOrder);

/**
 * @swagger
 * /orders/{id}/invoice:
 *   get:
 *     summary: Get order invoice
 *     tags: [Orders]
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
 *         description: Invoice data
 */
router.get('/:id/invoice', getInvoice);

/**
 * @swagger
 * /orders/{id}/cancel:
 *   patch:
 *     summary: Cancel an order
 *     tags: [Orders]
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
 *             reason: Changed my mind
 *     responses:
 *       200:
 *         description: Order cancelled and stock restored
 */
router.patch('/:id/cancel', validate({ body: cancelOrderSchema }), cancelOrder);

/**
 * @swagger
 * /orders/{id}/reorder:
 *   post:
 *     summary: Reorder a previous order
 *     tags: [Orders]
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
 *       201:
 *         description: New order created from previous order
 */
router.post('/:id/reorder', authorizeRoles(ROLES.USER, ROLES.SUPER_ADMIN), reorder);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order details
 *     tags: [Orders]
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
 *         description: Order details with business sub-orders and items
 *       404:
 *         description: Order not found
 */
router.get('/:id', getOrderById);

module.exports = router;
