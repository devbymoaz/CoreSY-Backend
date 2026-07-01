const express = require('express');
const router = express.Router();
const authenticate = require('../../../../src/middlewares/auth.middleware');
const validate = require('../../../../src/middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  createBranch,
  getBranches,
  getBranchById,
  getBusinessBranches,
  updateBranch,
  deleteBranch,
  updateBranchStatus,
  setMainBranch,
  getDashboardStats,
  uploadBranchImage,
  uploadBranchCoverImage,
} = require('../controllers/branch.controller');
const {
  createBranchSchema,
  updateBranchSchema,
  updateBranchStatusSchema,
  listBranchesSchema,
} = require('../validators/branch.validator');
const { ROLES } = require('../../../../src/constants');

// All branch routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /branches/dashboard:
 *   get:
 *     summary: Get branch dashboard stats
 *     tags: [Branches]
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
router.get('/dashboard', authorizeRoles(ROLES.SUPER_ADMIN), getDashboardStats);

/**
 * @swagger
 * /branches/business/{businessId}:
 *   get:
 *     summary: Get branches for a specific business
 *     tags: [Branches]
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
 *         description: List of branches
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/business/:businessId', getBusinessBranches);

/**
 * @swagger
 * /branches:
 *   get:
 *     summary: Get all branches
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of branches
 *       401:
 *         description: Unauthorized
 */
router.get('/', validate({ query: listBranchesSchema }), getBranches);

/**
 * @swagger
 * /branches:
 *   post:
 *     summary: Create a new branch
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Branch created
 *       401:
 *         description: Unauthorized
 */
router.post('/', validate({ body: createBranchSchema }), createBranch);

/**
 * @swagger
 * /branches/{id}:
 *   get:
 *     summary: Get a branch by ID
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Branch details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Branch not found
 */
router.get('/:id', getBranchById);

/**
 * @swagger
 * /branches/{id}:
 *   patch:
 *     summary: Update a branch
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Branch updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Branch not found
 */
router.patch('/:id', validate({ body: updateBranchSchema }), updateBranch);

/**
 * @swagger
 * /branches/{id}:
 *   delete:
 *     summary: Delete a branch (soft delete)
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Branch deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Branch not found
 */
router.delete('/:id', deleteBranch);

/**
 * @swagger
 * /branches/{id}/status:
 *   patch:
 *     summary: Update branch status (SUPER_ADMIN only)
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.patch(
  '/:id/status',
  authorizeRoles(ROLES.SUPER_ADMIN),
  validate({ body: updateBranchStatusSchema }),
  updateBranchStatus,
);

/**
 * @swagger
 * /branches/{id}/main:
 *   patch:
 *     summary: Set branch as main
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Main branch updated
 *       401:
 *         description: Unauthorized
 */
router.patch('/:id/main', setMainBranch);

// File upload endpoints
router.post('/:id/image', uploadBranchImage);
router.post('/:id/cover-image', uploadBranchCoverImage);

module.exports = router;
