/**
 * Customer wallet routes.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  getWallet,
  getBalance,
  getHistory,
  getTransactions,
  topUp,
  withdraw,
  transfer,
  getCustomerDashboard,
} = require('../controllers/wallet.controller');
const {
  topUpSchema,
  withdrawSchema,
  transferSchema,
  listTransactionsSchema,
} = require('../validators/wallet.validator');
const { ROLES } = require('../../../constants');

router.use(authenticate);
router.use(authorizeRoles(ROLES.USER, ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN));

/**
 * @swagger
 * tags:
 *   - name: Wallet
 *     description: Customer wallet management
 */

/**
 * @swagger
 * /wallet:
 *   get:
 *     summary: Get my wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet details
 */
router.get('/', getWallet);

/**
 * @swagger
 * /wallet/balance:
 *   get:
 *     summary: Get wallet balance
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Balance details
 */
router.get('/balance', getBalance);

/**
 * @swagger
 * /wallet/dashboard:
 *   get:
 *     summary: Customer wallet dashboard
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
router.get('/dashboard', getCustomerDashboard);

/**
 * @swagger
 * /wallet/history:
 *   get:
 *     summary: Wallet statement/history
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transaction history
 */
router.get('/history', validate({ query: listTransactionsSchema }), getHistory);

/**
 * @swagger
 * /wallet/transactions:
 *   get:
 *     summary: Wallet transactions
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transactions list
 */
router.get('/transactions', validate({ query: listTransactionsSchema }), getTransactions);

/**
 * @swagger
 * /wallet/top-up:
 *   post:
 *     summary: Top up wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             amount: 100
 *             description: Monthly top-up
 *     responses:
 *       200:
 *         description: Wallet topped up
 */
router.post('/top-up', validate({ body: topUpSchema }), topUp);

/**
 * @swagger
 * /wallet/withdraw:
 *   post:
 *     summary: Withdraw from wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             amount: 50
 *     responses:
 *       200:
 *         description: Withdrawal completed
 */
router.post('/withdraw', validate({ body: withdrawSchema }), withdraw);

/**
 * @swagger
 * /wallet/transfer:
 *   post:
 *     summary: Transfer between wallets
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             toCustomerId: 550e8400-e29b-41d4-a716-446655440000
 *             amount: 25
 *     responses:
 *       200:
 *         description: Transfer completed
 */
router.post('/transfer', validate({ body: transferSchema }), transfer);

module.exports = router;
