const express = require('express');
const router = express.Router();
const authenticate = require('../../../../src/middlewares/auth.middleware');
const validate = require('../../../../src/middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  createBusiness,
  getBusinesses,
  getBusinessById,
  getMyBusinesses,
  updateBusiness,
  deleteBusiness,
  updateBusinessStatus,
  approveBusiness,
  rejectBusiness,
  getDashboardStats,
  uploadLogo,
  uploadCoverImage,
} = require('../controllers/business.controller');
const {
  createBusinessSchema,
  updateBusinessSchema,
  updateBusinessStatusSchema,
  listBusinessesSchema,
} = require('../validators/business.validator');
const { ROLES } = require('../../../../src/constants');

// All business routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /businesses/my-businesses:
 *   get:
 *     summary: Get my businesses (Business Owner only)
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of my businesses
 */
router.get('/my-businesses', getMyBusinesses);

/**
 * @swagger
 * /businesses/dashboard:
 *   get:
 *     summary: Get dashboard statistics (Super Admin only)
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
router.get('/dashboard', authorizeRoles(ROLES.SUPER_ADMIN), getDashboardStats);

/**
 * @swagger
 * /businesses:
 *   get:
 *     summary: Get all businesses
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of businesses
 */
router.get('/', validate({ query: listBusinessesSchema }), getBusinesses);

/**
 * @swagger
 * /businesses/{id}:
 *   get:
 *     summary: Get business by ID
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *     responses:
 *       200:
 *         description: Business details
 */
router.get('/:id', getBusinessById);

/**
 * @swagger
 * /businesses:
 *   post:
 *     summary: Register a new business
 *     tags: [Businesses]
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
 *         description: Business created
 */
router.post('/', validate({ body: createBusinessSchema }), createBusiness);

/**
 * @swagger
 * /businesses/{id}:
 *   patch:
 *     summary: Update business
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *     responses:
 *       200:
 *         description: Business updated
 */
router.patch('/:id', validate({ body: updateBusinessSchema }), updateBusiness);

/**
 * @swagger
 * /businesses/{id}:
 *   delete:
 *     summary: Delete business (soft delete)
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *     responses:
 *       200:
 *         description: Business deleted
 */
router.delete('/:id', deleteBusiness);

/**
 * @swagger
 * /businesses/{id}/status:
 *   patch:
 *     summary: Update business status (Super Admin only)
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch(
  '/:id/status',
  authorizeRoles(ROLES.SUPER_ADMIN),
  validate({ body: updateBusinessStatusSchema }),
  updateBusinessStatus,
);

/**
 * @swagger
 * /businesses/{id}/approve:
 *   patch:
 *     summary: Approve business (Super Admin only)
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *     responses:
 *       200:
 *         description: Business approved
 */
router.patch('/:id/approve', authorizeRoles(ROLES.SUPER_ADMIN), approveBusiness);

/**
 * @swagger
 * /businesses/{id}/reject:
 *   patch:
 *     summary: Reject business (Super Admin only)
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *     responses:
 *       200:
 *         description: Business rejected
 */
router.patch('/:id/reject', authorizeRoles(ROLES.SUPER_ADMIN), rejectBusiness);

// TODO: File upload endpoints
router.post('/logo', uploadLogo);
router.post('/cover-image', uploadCoverImage);

module.exports = router;
