const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  createService,
  getServices,
  getServiceById,
  getBusinessServices,
  getBranchServices,
  updateService,
  deleteService,
  updateServiceStatus,
  updateServiceFeatured,
  getDashboardStats,
  uploadServiceImage,
  uploadServiceGallery,
} = require('../controllers/service.controller');
const {
  createServiceSchema,
  updateServiceSchema,
  updateServiceStatusSchema,
  listServicesSchema,
} = require('../validators/service.validator');
const { ROLES } = require('../../../constants');

// All service routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /services/dashboard:
 *   get:
 *     summary: Get service dashboard stats
 *     tags: [Services]
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
 * /services/business/{businessId}:
 *   get:
 *     summary: Get services for a specific business
 *     tags: [Services]
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
 *         description: List of services
 *       401:
 *         description: Unauthorized
 */
router.get('/business/:businessId', getBusinessServices);

/**
 * @swagger
 * /services/branch/{branchId}:
 *   get:
 *     summary: Get services for a specific branch
 *     tags: [Services]
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
 *         description: List of services
 *       401:
 *         description: Unauthorized
 */
router.get('/branch/:branchId', getBranchServices);

/**
 * @swagger
 * /services:
 *   get:
 *     summary: Get all services
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of services
 */
router.get('/', validate({ query: listServicesSchema }), getServices);

/**
 * @swagger
 * /services/{id}:
 *   get:
 *     summary: Get service by ID
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service details
 */
router.get('/:id', getServiceById);

/**
 * @swagger
 * /services:
 *   post:
 *     summary: Create a new service
 *     tags: [Services]
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
 *         description: Service created
 */
router.post('/', validate({ body: createServiceSchema }), createService);

/**
 * @swagger
 * /services/{id}:
 *   patch:
 *     summary: Update service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Service updated
 */
router.patch('/:id', validate({ body: updateServiceSchema }), updateService);

/**
 * @swagger
 * /services/{id}:
 *   delete:
 *     summary: Delete service (soft delete)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service deleted
 */
router.delete('/:id', deleteService);

/**
 * @swagger
 * /services/{id}/status:
 *   patch:
 *     summary: Update service status (SUPER_ADMIN only)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service ID
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
 */
router.patch(
  '/:id/status',
  authorizeRoles(ROLES.SUPER_ADMIN),
  validate({ body: updateServiceStatusSchema }),
  updateServiceStatus,
);

/**
 * @swagger
 * /services/{id}/feature:
 *   patch:
 *     summary: Update service featured status
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isFeatured]
 *     responses:
 *       200:
 *         description: Featured status updated
 */
router.patch('/:id/feature', updateServiceFeatured);

// File upload endpoints (TODO)
router.post('/image', uploadServiceImage);
router.post('/gallery', uploadServiceGallery);

module.exports = router;
