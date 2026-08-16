/**
 * Admin points routes.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  getAccounts,
  adjust,
  expirePoints,
  updateRules,
  getRules,
  getAdminDashboard,
} = require('../controllers/points.controller');
const {
  adjustSchema,
  updateRulesSchema,
  listAccountsSchema,
} = require('../validators/points.validator');
const { ROLES } = require('../../../constants');

router.use(authenticate);
router.use(authorizeRoles(ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN));

/**
 * @swagger
 * tags:
 *   - name: Admin Points
 *     description: Admin reward points management
 */

/**
 * @swagger
 * /admin/points/dashboard:
 *   get:
 *     summary: Admin points dashboard
 *     tags: [Admin Points]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
router.get('/dashboard', getAdminDashboard);

/**
 * @swagger
 * /admin/points:
 *   get:
 *     summary: List point accounts
 *     tags: [Admin Points]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Accounts list
 */
router.get('/', validate({ query: listAccountsSchema }), getAccounts);

/**
 * @swagger
 * /admin/points/rules:
 *   get:
 *     summary: Get point rules
 *     tags: [Admin Points]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rules list
 */
router.get('/rules', getRules);

/**
 * @swagger
 * /admin/points/rules:
 *   patch:
 *     summary: Update point earning rules
 *     tags: [Admin Points]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rules
 *             properties:
 *               rules:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - type
 *                     - name
 *                     - points
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [PAYMENT, BOOKING, ORDER, REFERRAL, BIRTHDAY, CAMPAIGN]
 *                     name:
 *                       type: string
 *                       minLength: 2
 *                       maxLength: 100
 *                     points:
 *                       type: integer
 *                       minimum: 0
 *                     minAmount:
 *                       type: number
 *                       minimum: 0
 *                       nullable: true
 *                     isActive:
 *                       type: boolean
 *                     description:
 *                       type: string
 *                       maxLength: 500
 *                       nullable: true
 *           example:
 *             rules:
 *               - type: ORDER
 *                 name: Order earn
 *                 points: 100
 *                 isActive: true
 *     responses:
 *       200:
 *         description: Rules updated
 */
router.patch('/rules', validate({ body: updateRulesSchema }), updateRules);

/**
 * @swagger
 * /admin/points/adjust:
 *   post:
 *     summary: Admin points adjustment or bonus
 *     tags: [Admin Points]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - points
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *               points:
 *                 type: integer
 *                 minimum: 1
 *               direction:
 *                 type: string
 *                 enum: [CREDIT, DEBIT]
 *                 default: CREDIT
 *               bonusType:
 *                 type: string
 *                 enum: [BIRTHDAY, REFERRAL, CAMPAIGN]
 *                 nullable: true
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 nullable: true
 *           example:
 *             customerId: a7f11770-5f94-445d-bd33-307cdba8f600
 *             points: 50
 *             direction: CREDIT
 *             bonusType: BIRTHDAY
 *             reason: Birthday bonus
 *     responses:
 *       200:
 *         description: Points adjusted
 */
router.post('/adjust', validate({ body: adjustSchema }), adjust);

/**
 * @swagger
 * /admin/points/expire:
 *   patch:
 *     summary: Expire due points
 *     tags: [Admin Points]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Points expired
 */
router.patch('/expire', expirePoints);

module.exports = router;
