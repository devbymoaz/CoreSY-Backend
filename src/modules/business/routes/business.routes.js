const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
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
const { ROLES } = require('../../../constants');

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
 *             required:
 *               - name
 *               - type
 *               - category
 *               - description
 *               - ownerName
 *               - ownerEmail
 *               - ownerPhone
 *               - businessEmail
 *               - businessPhone
 *               - registrationNumber
 *               - governorateId
 *               - city
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *               type:
 *                 type: string
 *                 enum: [RESTAURANT, CAFE, BAR, MEDICAL_CLINIC, HOSPITAL, DENTAL_CLINIC, PHARMACY, BEAUTY_SALON, SPA, GYM, SPORTS_CLUB, ENTERTAINMENT_CENTER, JUICE_SHOP, SWEET_SHOP, SUPERMARKET, RETAIL_STORE, OTHER]
 *               category:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 minLength: 10
 *               ownerName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *               ownerEmail:
 *                 type: string
 *                 format: email
 *                 description: Login email for the business owner account
 *               ownerPhone:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 20
 *               businessEmail:
 *                 type: string
 *                 format: email
 *               businessPhone:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 20
 *               registrationNumber:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               taxNumber:
 *                 type: string
 *                 nullable: true
 *               website:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *               governorateId:
 *                 type: string
 *                 format: uuid
 *               city:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               address:
 *                 type: string
 *                 minLength: 5
 *               latitude:
 *                 type: number
 *                 nullable: true
 *               longitude:
 *                 type: number
 *                 nullable: true
 *               workingHours:
 *                 type: object
 *                 nullable: true
 *               facebook:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *               instagram:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *               whatsApp:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 20
 *                 nullable: true
 *               ownerPassword:
 *                 type: string
 *                 format: password
 *                 description: Required only when ownerEmail does not already have a CoreSY account. Alias field `password` is also accepted.
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Alias for ownerPassword (Flutter / client compatibility)
 *           example:
 *             name: Damascus Grill
 *             type: RESTAURANT
 *             category: Food & Beverage
 *             description: A popular restaurant serving traditional Syrian cuisine.
 *             ownerName: Ahmad Hassan
 *             ownerEmail: ahmad@example.com
 *             ownerPhone: "+963912345678"
 *             businessEmail: contact@damascusgrill.com
 *             businessPhone: "+963987654321"
 *             registrationNumber: REG-123456
 *             taxNumber: TAX-789012
 *             website: https://damascusgrill.com
 *             governorateId: a7f11770-5f94-445d-bd33-307cdba8f600
 *             city: Damascus
 *             address: Main Street, Building 42
 *             latitude: 33.5138
 *             longitude: 36.2765
 *             workingHours:
 *               monday: "9:00-22:00"
 *               tuesday: "9:00-22:00"
 *             facebook: https://facebook.com/damascusgrill
 *             instagram: https://instagram.com/damascusgrill
 *             whatsApp: "+963912345678"
 *             ownerPassword: SecurePass123!
 *     responses:
 *       201:
 *         description: Business created
 */
router.post(
  '/',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.BUSINESS_OWNER),
  validate({ body: createBusinessSchema }),
  createBusiness,
);

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
 *           format: uuid
 *         example: a7f11770-5f94-445d-bd33-307cdba8f600
 *         description: Business ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *               type:
 *                 type: string
 *                 enum: [RESTAURANT, CAFE, BAR, MEDICAL_CLINIC, HOSPITAL, DENTAL_CLINIC, PHARMACY, BEAUTY_SALON, SPA, GYM, SPORTS_CLUB, ENTERTAINMENT_CENTER, JUICE_SHOP, SWEET_SHOP, SUPERMARKET, RETAIL_STORE, OTHER]
 *               category:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 minLength: 10
 *               ownerName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *               ownerEmail:
 *                 type: string
 *                 format: email
 *               ownerPhone:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 20
 *               businessEmail:
 *                 type: string
 *                 format: email
 *               businessPhone:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 20
 *               registrationNumber:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               taxNumber:
 *                 type: string
 *                 nullable: true
 *               website:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *               governorateId:
 *                 type: string
 *                 format: uuid
 *               city:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               address:
 *                 type: string
 *                 minLength: 5
 *               latitude:
 *                 type: number
 *                 nullable: true
 *               longitude:
 *                 type: number
 *                 nullable: true
 *               workingHours:
 *                 type: object
 *                 nullable: true
 *               facebook:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *               instagram:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *               whatsApp:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 20
 *                 nullable: true
 *               ownerPassword:
 *                 type: string
 *                 format: password
 *                 description: Alias field `password` is also accepted.
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Alias for ownerPassword (Flutter / client compatibility)
 *           example:
 *             name: Damascus Grill Updated
 *             category: Fine Dining
 *             description: Updated description for the restaurant.
 *             businessPhone: "+963987654322"
 *             website: https://damascusgrill.com
 *             city: Damascus
 *             address: Main Street, Building 43
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
 *           format: uuid
 *         example: a7f11770-5f94-445d-bd33-307cdba8f600
 *         description: Business ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, UNDER_REVIEW, APPROVED, REJECTED, SUSPENDED, INACTIVE, ACTIVE]
 *           example:
 *             status: ACTIVE
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
 *           format: uuid
 *         example: a7f11770-5f94-445d-bd33-307cdba8f600
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
 *           format: uuid
 *         example: a7f11770-5f94-445d-bd33-307cdba8f600
 *         description: Business ID
 *     responses:
 *       200:
 *         description: Business rejected
 */
router.patch('/:id/reject', authorizeRoles(ROLES.SUPER_ADMIN), rejectBusiness);

/**
 * @swagger
 * /businesses/logo:
 *   post:
 *     summary: Upload business logo
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Logo image file (e.g. PNG, JPG)
 *     responses:
 *       200:
 *         description: Logo uploaded
 */
router.post('/logo', uploadLogo);

/**
 * @swagger
 * /businesses/cover-image:
 *   post:
 *     summary: Upload business cover image
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Cover image file (e.g. PNG, JPG)
 *     responses:
 *       200:
 *         description: Cover image uploaded
 */
router.post('/cover-image', uploadCoverImage);

module.exports = router;
