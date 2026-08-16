/**
 * Admin payment routes.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  getAdminPayments,
  refundPayment,
  verifyPayment,
  getPlatformDashboard,
} = require('../controllers/payment.controller');
const { listPaymentsSchema, refundPaymentSchema } = require('../validators/payment.validator');
const { ROLES } = require('../../../constants');

router.use(authenticate);
router.use(authorizeRoles(ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN));

/**
 * @swagger
 * tags:
 *   - name: Admin Payments
 *     description: Admin payment and refund management
 */

/**
 * @swagger
 * /admin/payments/dashboard:
 *   get:
 *     summary: Platform payment dashboard
 *     tags: [Admin Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform revenue stats
 */
router.get('/dashboard', getPlatformDashboard);

/**
 * @swagger
 * /admin/payments:
 *   get:
 *     summary: List all payments
 *     tags: [Admin Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payments list
 */
router.get('/', validate({ query: listPaymentsSchema }), getAdminPayments);

/**
 * @swagger
 * /admin/transactions:
 *   get:
 *     summary: List all transactions
 *     tags: [Admin Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transactions list
 */
router.get('/transactions', validate({ query: listPaymentsSchema }), getAdminPayments);

/**
 * @swagger
 * /admin/payments/refund:
 *   patch:
 *     summary: Refund a payment (full or partial)
 *     tags: [Admin Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentId
 *             properties:
 *               paymentId:
 *                 type: string
 *                 format: uuid
 *               amount:
 *                 type: number
 *                 minimum: 0
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 nullable: true
 *           example:
 *             paymentId: a7f11770-5f94-445d-bd33-307cdba8f600
 *             amount: 25
 *             reason: Customer complaint
 *     responses:
 *       200:
 *         description: Refund processed to wallet
 */
router.patch('/refund', validate({ body: refundPaymentSchema }), refundPayment);

/**
 * @swagger
 * /admin/payments/{id}/verify:
 *   patch:
 *     summary: Verify a pending payment
 *     tags: [Admin Payments]
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
 *         description: Payment verified
 */
router.patch('/:id/verify', verifyPayment);

module.exports = router;
