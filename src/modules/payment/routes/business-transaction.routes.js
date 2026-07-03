/**
 * Business transactions route alias.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const { getBusinessTransactions } = require('../controllers/payment.controller');
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
 * /business/transactions:
 *   get:
 *     summary: List business transactions
 *     tags: [Business Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transactions list
 */
router.get('/', validate({ query: listPaymentsSchema }), getBusinessTransactions);

module.exports = router;
