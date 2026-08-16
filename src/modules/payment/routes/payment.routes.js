/**
 * Customer payment routes.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const {
  createPayment,
  getPayments,
  getHistory,
  getPaymentById,
  getInvoice,
  cancelPayment,
  getCustomerDashboard,
} = require('../controllers/payment.controller');
const {
  createPaymentSchema,
  cancelPaymentSchema,
  listPaymentsSchema,
} = require('../validators/payment.validator');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Payments
 *     description: Customer payment management
 */

/**
 * @swagger
 * /payments/dashboard:
 *   get:
 *     summary: Customer payment dashboard
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
router.get('/dashboard', getCustomerDashboard);

/**
 * @swagger
 * /payments/history:
 *   get:
 *     summary: Payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment history
 */
router.get('/history', validate({ query: listPaymentsSchema }), getHistory);

/**
 * @swagger
 * /payments/invoice/{id}:
 *   get:
 *     summary: Get payment invoice and receipt
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: a7f11770-5f94-445d-bd33-307cdba8f600
 *     responses:
 *       200:
 *         description: Invoice and receipt
 */
router.get('/invoice/:id', getInvoice);

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: List my payments
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payments list
 */
router.get('/', validate({ query: listPaymentsSchema }), getPayments);

/**
 * @swagger
 * /payments:
 *   post:
 *     summary: Create a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethod
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *               bookingId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               orderId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               businessId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               branchId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH, WALLET, CREDIT_CARD, DEBIT_CARD, APPLE_PAY, GOOGLE_PAY, STRIPE, PAYPAL]
 *               paymentType:
 *                 type: string
 *                 enum: [BOOKING, ORDER, TOP_UP, OTHER]
 *               subtotal:
 *                 type: number
 *                 minimum: 0
 *               discount:
 *                 type: number
 *                 minimum: 0
 *               subscriberDiscount:
 *                 type: number
 *                 minimum: 0
 *               platformFee:
 *                 type: number
 *                 minimum: 0
 *               deliveryFee:
 *                 type: number
 *                 minimum: 0
 *               tax:
 *                 type: number
 *                 minimum: 0
 *               grandTotal:
 *                 type: number
 *                 minimum: 0
 *               currency:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 3
 *               gatewayReference:
 *                 type: string
 *                 maxLength: 255
 *                 nullable: true
 *           example:
 *             orderId: a7f11770-5f94-445d-bd33-307cdba8f600
 *             paymentMethod: WALLET
 *             paymentType: ORDER
 *             grandTotal: 99.99
 *             currency: USD
 *     responses:
 *       201:
 *         description: Payment created
 *       409:
 *         description: Duplicate payment
 */
router.post('/', validate({ body: createPaymentSchema }), createPayment);

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     summary: Get payment by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: a7f11770-5f94-445d-bd33-307cdba8f600
 *     responses:
 *       200:
 *         description: Payment details
 */
router.get('/:id', getPaymentById);

/**
 * @swagger
 * /payments/{id}/cancel:
 *   patch:
 *     summary: Cancel a pending payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: a7f11770-5f94-445d-bd33-307cdba8f600
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
 *             reason: Changed payment method
 *     responses:
 *       200:
 *         description: Payment cancelled
 */
router.patch('/:id/cancel', validate({ body: cancelPaymentSchema }), cancelPayment);

module.exports = router;
