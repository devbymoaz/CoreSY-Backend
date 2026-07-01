const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const {
  createCashier,
  getCashiers,
  getCashierById,
  getBusinessCashiers,
  getBranchCashiers,
  updateCashier,
  deleteCashier,
  updateCashierStatus,
  resetCashierPassword,
  getCashierProfile,
  updateCashierProfile,
  changeCashierPassword,
  getDashboardStats,
  uploadProfileImage,
} = require('../controllers/cashier.controller');
const {
  createCashierSchema,
  updateCashierSchema,
  updateCashierStatusSchema,
  resetCashierPasswordSchema,
  changeCashierPasswordSchema,
  listCashiersSchema,
  updateCashierProfileSchema,
} = require('../validators/cashier.validator');
const { ROLES } = require('../../../constants');

router.use(authenticate);

/**
 * @swagger
 * /cashiers/profile:
 *   get:
 *     summary: Get cashier's own profile
 *     tags: [Cashiers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cashier profile
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', getCashierProfile);

/**
 * @swagger
 * /cashiers/profile:
 *   patch:
 *     summary: Update cashier's own profile
 *     tags: [Cashiers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized
 */
router.patch('/profile', validate({ body: updateCashierProfileSchema }), updateCashierProfile);

/**
 * @swagger
 * /cashiers/change-password:
 *   patch:
 *     summary: Cashier changes own password
 *     tags: [Cashiers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *     responses:
 *       200:
 *         description: Password changed
 *       401:
 *         description: Unauthorized
 */
router.patch(
  '/change-password',
  validate({ body: changeCashierPasswordSchema }),
  changeCashierPassword,
);

/**
 * @swagger
 * /cashiers/dashboard:
 *   get:
 *     summary: Get cashier dashboard stats
 *     tags: [Cashiers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/dashboard', getDashboardStats);

/**
 * @swagger
 * /cashiers/business/{businessId}:
 *   get:
 *     summary: Get all cashiers for a specific business
 *     tags: [Cashiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *     responses:
 *       200:
 *         description: List of cashiers
 *       401:
 *         description: Unauthorized
 */
router.get('/business/:businessId', getBusinessCashiers);

/**
 * @swagger
 * /cashiers/branch/{branchId}:
 *   get:
 *     summary: Get all cashiers for a specific branch
 *     tags: [Cashiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: List of cashiers
 *       401:
 *         description: Unauthorized
 */
router.get('/branch/:branchId', getBranchCashiers);

/**
 * @swagger
 * /cashiers:
 *   get:
 *     summary: Get all cashiers with pagination and filters
 *     tags: [Cashiers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of cashiers
 *       401:
 *         description: Unauthorized
 */
router.get('/', validate({ query: listCashiersSchema }), getCashiers);

/**
 * @swagger
 * /cashiers/{id}:
 *   get:
 *     summary: Get cashier by ID
 *     tags: [Cashiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Cashier ID
 *     responses:
 *       200:
 *         description: Cashier details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
router.get('/:id', getCashierById);

/**
 * @swagger
 * /cashiers:
 *   post:
 *     summary: Create a new cashier
 *     tags: [Cashiers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Cashier created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', validate({ body: createCashierSchema }), createCashier);

/**
 * @swagger
 * /cashiers/{id}:
 *   patch:
 *     summary: Update cashier details
 *     tags: [Cashiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Cashier ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cashier updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.patch('/:id', validate({ body: updateCashierSchema }), updateCashier);

/**
 * @swagger
 * /cashiers/{id}:
 *   delete:
 *     summary: Delete cashier (soft delete)
 *     tags: [Cashiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Cashier ID
 *     responses:
 *       200:
 *         description: Cashier deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.delete('/:id', deleteCashier);

/**
 * @swagger
 * /cashiers/{id}/status:
 *   patch:
 *     summary: Update cashier status
 *     tags: [Cashiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Cashier ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *     responses:
 *       200:
 *         description: Status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.patch('/:id/status', validate({ body: updateCashierStatusSchema }), updateCashierStatus);

/**
 * @swagger
 * /cashiers/{id}/reset-password:
 *   patch:
 *     summary: Reset cashier password (admin only)
 *     tags: [Cashiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Cashier ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *     responses:
 *       200:
 *         description: Password reset
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.patch(
  '/:id/reset-password',
  validate({ body: resetCashierPasswordSchema }),
  resetCashierPassword,
);

/**
 * @swagger
 * /cashiers/profile-image:
 *   post:
 *     summary: Upload cashier profile image
 *     tags: [Cashiers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Image uploaded
 *       401:
 *         description: Unauthorized
 */
router.post('/profile-image', uploadProfileImage);

module.exports = router;
