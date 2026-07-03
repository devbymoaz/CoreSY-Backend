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
 *           example:
 *             orderId: 550e8400-e29b-41d4-a716-446655440000
 *             paymentMethod: WALLET
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
 *     requestBody:
 *       content:
 *         application/json:
 *           example:
 *             reason: Changed payment method
 *     responses:
 *       200:
 *         description: Payment cancelled
 */
router.patch('/:id/cancel', validate({ body: cancelPaymentSchema }), cancelPayment);

module.exports = router;
