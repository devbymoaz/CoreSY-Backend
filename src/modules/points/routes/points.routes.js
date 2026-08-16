/**
 * Customer points routes.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  getPoints,
  getBalance,
  getHistory,
  redeem,
  getCustomerDashboard,
} = require('../controllers/points.controller');
const { redeemSchema, listHistorySchema } = require('../validators/points.validator');
const { ROLES } = require('../../../constants');

router.use(authenticate);
router.use(authorizeRoles(ROLES.USER, ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN));

/**
 * @swagger
 * tags:
 *   - name: Points
 *     description: Customer reward points and loyalty
 */

/**
 * @swagger
 * /points:
 *   get:
 *     summary: Get my points account
 *     tags: [Points]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Point account
 */
router.get('/', getPoints);

/**
 * @swagger
 * /points/balance:
 *   get:
 *     summary: Get points balance and tier
 *     tags: [Points]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Balance details
 */
router.get('/balance', getBalance);

/**
 * @swagger
 * /points/dashboard:
 *   get:
 *     summary: Customer points dashboard
 *     tags: [Points]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
router.get('/dashboard', getCustomerDashboard);

/**
 * @swagger
 * /points/history:
 *   get:
 *     summary: Points history
 *     tags: [Points]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transaction history
 */
router.get('/history', validate({ query: listHistorySchema }), getHistory);

/**
 * @swagger
 * /points/redeem:
 *   post:
 *     summary: Redeem points
 *     tags: [Points]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - points
 *             properties:
 *               points:
 *                 type: integer
 *                 minimum: 1
 *               description:
 *                 type: string
 *                 maxLength: 255
 *                 nullable: true
 *           example:
 *             points: 100
 *             description: Redeem for discount
 *     responses:
 *       200:
 *         description: Points redeemed
 */
router.post('/redeem', validate({ body: redeemSchema }), redeem);

module.exports = router;
