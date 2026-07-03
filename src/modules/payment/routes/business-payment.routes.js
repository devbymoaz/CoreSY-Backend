/**
 * Business payment routes.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  getBusinessPayments,
  getTodayBusinessPayments,
  getBusinessDashboard,
} = require('../controllers/payment.controller');
const { listPaymentsSchema } = require('../validators/payment.validator');
const { ROLES } = require('../../../constants');

router.use(authenticate);
router.use(
  authorizeRoles(
    ROLES.SUPER_ADMIN,
    ROLES.FINANCE_ADMIN,
    ROLES.BUSINESS_OWNER,
    ROLES.BUSINESS_MANAGER,
  ),
);

/**
 * @swagger
 * tags:
 *   - name: Business Payments
 *     description: Business payment and transaction views
 */

/**
 * @swagger
 * /business/payments/dashboard:
 *   get:
 *     summary: Business payment dashboard
 *     tags: [Business Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue stats
 */
router.get('/dashboard', getBusinessDashboard);

/**
 * @swagger
 * /business/payments/today:
 *   get:
 *     summary: Today's business payments
 *     tags: [Business Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's payments
 */
router.get('/today', validate({ query: listPaymentsSchema }), getTodayBusinessPayments);

/**
 * @swagger
 * /business/payments:
 *   get:
 *     summary: List business payments
 *     tags: [Business Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payments list
 */
router.get('/', validate({ query: listPaymentsSchema }), getBusinessPayments);

module.exports = router;
