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
 *             required:
 *               - name
 *               - businessId
 *               - branchId
 *               - category
 *               - type
 *               - description
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 example: Premium Dinner Package
 *               businessId:
 *                 type: string
 *                 format: uuid
 *                 example: a7f11770-5f94-445d-bd33-307cdba8f600
 *               branchId:
 *                 type: string
 *                 format: uuid
 *                 example: b8e22881-6a05-456e-ce44-418decb9f711
 *               category:
 *                 type: string
 *                 enum: [FOOD_AND_DRINKS, MEDICAL, HEALTHCARE, BEAUTY, FITNESS, SPORTS, ENTERTAINMENT, RETAIL, DELIVERY, OTHER]
 *                 example: FOOD_AND_DRINKS
 *               type:
 *                 type: string
 *                 enum: [RESTAURANT, CAFE, BAR, MEDICAL_CONSULTATION, DENTAL_CONSULTATION, LABORATORY, PHARMACY, BEAUTY_SERVICE, SPA_TREATMENT, GYM_MEMBERSHIP, SPORTS_ACTIVITY, ENTERTAINMENT_ACTIVITY, DELIVERY_PRODUCT, RETAIL_PRODUCT, OTHER]
 *                 example: RESTAURANT
 *               description:
 *                 type: string
 *                 example: A curated three-course dinner experience with seasonal ingredients.
 *               shortDescription:
 *                 type: string
 *                 nullable: true
 *                 example: Three-course dinner
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 example: 49.99
 *               discountPercentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 nullable: true
 *                 example: 10
 *               coresyDiscount:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 nullable: true
 *                 example: 5
 *               platformFee:
 *                 type: number
 *                 minimum: 0
 *                 nullable: true
 *                 example: 2.5
 *               duration:
 *                 type: integer
 *                 minimum: 1
 *                 nullable: true
 *                 example: 90
 *               maxCapacity:
 *                 type: integer
 *                 minimum: 1
 *                 nullable: true
 *                 example: 20
 *               bookingRequired:
 *                 type: boolean
 *                 default: false
 *                 example: true
 *               appointmentRequired:
 *                 type: boolean
 *                 default: false
 *                 example: false
 *               deliveryAvailable:
 *                 type: boolean
 *                 default: false
 *                 example: false
 *           example:
 *             name: Premium Dinner Package
 *             businessId: a7f11770-5f94-445d-bd33-307cdba8f600
 *             branchId: b8e22881-6a05-456e-ce44-418decb9f711
 *             category: FOOD_AND_DRINKS
 *             type: RESTAURANT
 *             description: A curated three-course dinner experience with seasonal ingredients.
 *             shortDescription: Three-course dinner
 *             price: 49.99
 *             discountPercentage: 10
 *             coresyDiscount: 5
 *             platformFee: 2.5
 *             duration: 90
 *             maxCapacity: 20
 *             bookingRequired: true
 *             appointmentRequired: false
 *             deliveryAvailable: false
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: Premium Dinner Package
 *               category:
 *                 type: string
 *                 enum: [FOOD_AND_DRINKS, MEDICAL, HEALTHCARE, BEAUTY, FITNESS, SPORTS, ENTERTAINMENT, RETAIL, DELIVERY, OTHER]
 *                 example: FOOD_AND_DRINKS
 *               type:
 *                 type: string
 *                 enum: [RESTAURANT, CAFE, BAR, MEDICAL_CONSULTATION, DENTAL_CONSULTATION, LABORATORY, PHARMACY, BEAUTY_SERVICE, SPA_TREATMENT, GYM_MEMBERSHIP, SPORTS_ACTIVITY, ENTERTAINMENT_ACTIVITY, DELIVERY_PRODUCT, RETAIL_PRODUCT, OTHER]
 *                 example: RESTAURANT
 *               description:
 *                 type: string
 *                 example: Updated three-course dinner experience with seasonal ingredients.
 *               shortDescription:
 *                 type: string
 *                 nullable: true
 *                 example: Three-course dinner
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 example: 54.99
 *               discountPercentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 nullable: true
 *                 example: 15
 *               coresyDiscount:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 nullable: true
 *                 example: 5
 *               platformFee:
 *                 type: number
 *                 minimum: 0
 *                 nullable: true
 *                 example: 2.5
 *               duration:
 *                 type: integer
 *                 minimum: 1
 *                 nullable: true
 *                 example: 120
 *               maxCapacity:
 *                 type: integer
 *                 minimum: 1
 *                 nullable: true
 *                 example: 25
 *               bookingRequired:
 *                 type: boolean
 *                 example: true
 *               appointmentRequired:
 *                 type: boolean
 *                 example: false
 *               deliveryAvailable:
 *                 type: boolean
 *                 example: true
 *           example:
 *             name: Premium Dinner Package
 *             price: 54.99
 *             discountPercentage: 15
 *             duration: 120
 *             maxCapacity: 25
 *             deliveryAvailable: true
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PENDING, ACTIVE, INACTIVE, SUSPENDED, ARCHIVED]
 *                 example: ACTIVE
 *           example:
 *             status: ACTIVE
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
 *             required:
 *               - isFeatured
 *             properties:
 *               isFeatured:
 *                 type: boolean
 *                 example: true
 *           example:
 *             isFeatured: true
 *     responses:
 *       200:
 *         description: Featured status updated
 */
router.patch('/:id/feature', updateServiceFeatured);

/**
 * @swagger
 * /services/image:
 *   post:
 *     summary: Upload service image
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded
 *       401:
 *         description: Unauthorized
 */
router.post('/image', uploadServiceImage);

/**
 * @swagger
 * /services/gallery:
 *   post:
 *     summary: Upload service gallery image
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Gallery image uploaded
 *       401:
 *         description: Unauthorized
 */
router.post('/gallery', uploadServiceGallery);

module.exports = router;
