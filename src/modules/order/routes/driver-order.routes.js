/**
 * Driver order routes.
 * Assigned delivery orders: accept, decline, and delivery status updates.
 */

const express = require('express');
const router = express.Router();
const driverAuthenticate = require('../../driver/middlewares/driver-auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const {
  getDriverOrders,
  getDriverOrderById,
  driverAcceptOrder,
  driverDeclineOrder,
  driverPickedUpOrder,
  driverOnTheWayOrder,
  driverDeliveredOrder,
} = require('../controllers/order.controller');
const {
  getBusinessOrderQRs,
  scanOrderQR,
  createDeliveryPaymentQR,
} = require('../controllers/order-qr.controller');
const {
  listDriverOrdersSchema,
  declineDriverOrderSchema,
} = require('../validators/order.validator');
const { scanOrderQRSchema } = require('../validators/order-qr.validator');

router.use(driverAuthenticate);

/**
 * @swagger
 * tags:
 *   - name: Driver Orders
 *     description: Driver-facing assigned delivery order APIs
 */

/**
 * @swagger
 * /drivers/orders:
 *   get:
 *     summary: List orders assigned to the authenticated driver
 *     tags: [Driver Orders]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ASSIGNED, PICKED_UP, ON_THE_WAY, DELIVERED, CANCELLED]
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *           description: Only ASSIGNED / PICKED_UP / ON_THE_WAY
 *       - in: query
 *         name: historyOnly
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Driver orders list
 */
router.get('/', validate({ query: listDriverOrdersSchema }), getDriverOrders);

/**
 * @swagger
 * /drivers/orders/scan-qr:
 *   post:
 *     summary: Driver scans business pickup QR → status PICKED_UP + payment QR
 *     tags: [Driver Orders]
 *     security:
 *       - bearerAuth: []
 */
router.post('/scan-qr', validate({ body: scanOrderQRSchema }), scanOrderQR);

/**
 * @swagger
 * /drivers/orders/{id}:
 *   get:
 *     summary: Get assigned business order details
 *     tags: [Driver Orders]
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
 *         description: Business order details
 */
router.get('/:id', getDriverOrderById);

/**
 * @swagger
 * /drivers/orders/{id}/qrs:
 *   get:
 *     summary: List QRs for assigned business order
 *     tags: [Driver Orders]
 */
router.get('/:id/qrs', getBusinessOrderQRs);

/**
 * @swagger
 * /drivers/orders/{id}/payment-qr:
 *   post:
 *     summary: Get/create delivery payment QR for customer to scan
 *     tags: [Driver Orders]
 */
router.post('/:id/payment-qr', createDeliveryPaymentQR);

/**
 * @swagger
 * /drivers/orders/{id}/accept:
 *   patch:
 *     summary: Driver accepts assigned order
 *     tags: [Driver Orders]
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
 *         description: Order accepted by driver
 */
router.patch('/:id/accept', driverAcceptOrder);

/**
 * @swagger
 * /drivers/orders/{id}/decline:
 *   patch:
 *     summary: Driver declines assigned order
 *     tags: [Driver Orders]
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
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Order declined; business can re-assign
 */
router.patch(
  '/:id/decline',
  validate({ body: declineDriverOrderSchema }),
  driverDeclineOrder,
);

/**
 * @swagger
 * /drivers/orders/{id}/picked-up:
 *   patch:
 *     summary: Driver picked up order from branch
 *     tags: [Driver Orders]
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
 *         description: Order marked picked up
 */
router.patch('/:id/picked-up', driverPickedUpOrder);

/**
 * @swagger
 * /drivers/orders/{id}/on-the-way:
 *   patch:
 *     summary: Driver is on the way to customer
 *     tags: [Driver Orders]
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
 *         description: Order on the way
 */
router.patch('/:id/on-the-way', driverOnTheWayOrder);

/**
 * @swagger
 * /drivers/orders/{id}/delivered:
 *   patch:
 *     summary: Driver completed delivery
 *     tags: [Driver Orders]
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
 *         description: Order delivered
 */
router.patch('/:id/delivered', driverDeliveredOrder);

module.exports = router;
