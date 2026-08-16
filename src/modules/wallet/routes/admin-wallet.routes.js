/**
 * Admin wallet routes.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  getWallets,
  getWalletById,
  freezeWallet,
  unfreezeWallet,
  adjustWallet,
  getAdminDashboard,
} = require('../controllers/wallet.controller');
const { listWalletsSchema, adjustWalletSchema } = require('../validators/wallet.validator');
const { ROLES } = require('../../../constants');

router.use(authenticate);
router.use(authorizeRoles(ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN));

/**
 * @swagger
 * tags:
 *   - name: Admin Wallets
 *     description: Admin wallet management
 */

/**
 * @swagger
 * /admin/wallets/dashboard:
 *   get:
 *     summary: Platform wallet dashboard
 *     tags: [Admin Wallets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
router.get('/dashboard', getAdminDashboard);

/**
 * @swagger
 * /admin/wallets:
 *   get:
 *     summary: List wallets
 *     tags: [Admin Wallets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallets list
 */
router.get('/', validate({ query: listWalletsSchema }), getWallets);

/**
 * @swagger
 * /admin/wallets/adjust:
 *   post:
 *     summary: Admin wallet balance adjustment
 *     tags: [Admin Wallets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - walletId
 *               - amount
 *               - direction
 *             properties:
 *               walletId:
 *                 type: string
 *                 format: uuid
 *               amount:
 *                 type: number
 *                 exclusiveMinimum: 0
 *               direction:
 *                 type: string
 *                 enum: [CREDIT, DEBIT]
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 nullable: true
 *           example:
 *             walletId: a7f11770-5f94-445d-bd33-307cdba8f600
 *             amount: 20
 *             direction: CREDIT
 *             reason: Compensation
 *     responses:
 *       200:
 *         description: Balance adjusted
 */
router.post('/adjust', validate({ body: adjustWalletSchema }), adjustWallet);

/**
 * @swagger
 * /admin/wallets/{id}:
 *   get:
 *     summary: Get wallet by ID
 *     tags: [Admin Wallets]
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
 *         description: Wallet details
 */
router.get('/:id', getWalletById);

/**
 * @swagger
 * /admin/wallets/{id}/freeze:
 *   patch:
 *     summary: Freeze wallet
 *     tags: [Admin Wallets]
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
 *         description: Wallet frozen
 */
router.patch('/:id/freeze', freezeWallet);

/**
 * @swagger
 * /admin/wallets/freeze:
 *   patch:
 *     summary: Freeze wallet by body walletId
 *     tags: [Admin Wallets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - walletId
 *             properties:
 *               walletId:
 *                 type: string
 *                 format: uuid
 *           example:
 *             walletId: a7f11770-5f94-445d-bd33-307cdba8f600
 *     responses:
 *       200:
 *         description: Wallet frozen
 */
router.patch('/freeze', freezeWallet);

/**
 * @swagger
 * /admin/wallets/{id}/unfreeze:
 *   patch:
 *     summary: Unfreeze wallet
 *     tags: [Admin Wallets]
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
 *         description: Wallet unfrozen
 */
router.patch('/:id/unfreeze', unfreezeWallet);

/**
 * @swagger
 * /admin/wallets/unfreeze:
 *   patch:
 *     summary: Unfreeze wallet by body walletId
 *     tags: [Admin Wallets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - walletId
 *             properties:
 *               walletId:
 *                 type: string
 *                 format: uuid
 *           example:
 *             walletId: a7f11770-5f94-445d-bd33-307cdba8f600
 *     responses:
 *       200:
 *         description: Wallet unfrozen
 */
router.patch('/unfreeze', unfreezeWallet);

module.exports = router;
