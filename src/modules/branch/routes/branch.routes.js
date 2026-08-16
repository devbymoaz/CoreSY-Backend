const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
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
const { ROLES } = require('../../../constants');
const {
  upload,
  setUploadFolder,
  requireUploadedFile,
  validateUploadedFileSignatures,
} = require('../../../middlewares/upload.middleware');

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
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACTIVE, INACTIVE, SUSPENDED, CLOSED]
 *       - in: query
 *         name: governorateId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: isMain
 *         schema:
 *           type: boolean
 *         description: Filter main branches only
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - businessId
 *               - type
 *               - governorateId
 *               - city
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *                 example: Downtown Branch
 *               businessId:
 *                 type: string
 *                 format: uuid
 *               type:
 *                 type: string
 *                 example: RESTAURANT
 *               description:
 *                 type: string
 *                 nullable: true
 *               governorateId:
 *                 type: string
 *                 format: uuid
 *               city:
 *                 type: string
 *                 example: Lahore
 *               address:
 *                 type: string
 *                 example: Main Street 12
 *               latitude:
 *                 type: number
 *                 nullable: true
 *               longitude:
 *                 type: number
 *                 nullable: true
 *               googleMapLink:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *               contactEmail:
 *                 type: string
 *                 format: email
 *                 nullable: true
 *               contactPhone:
 *                 type: string
 *                 nullable: true
 *               whatsAppNumber:
 *                 type: string
 *                 nullable: true
 *               workingDays:
 *                 type: object
 *                 nullable: true
 *               openingTime:
 *                 type: string
 *                 example: "09:00"
 *                 nullable: true
 *               closingTime:
 *                 type: string
 *                 example: "22:00"
 *                 nullable: true
 *               emergencyContact:
 *                 type: string
 *                 nullable: true
 *               isMain:
 *                 type: boolean
 *                 default: false
 *                 description: Set as the main branch for the business
 *           example:
 *             name: Downtown Branch
 *             businessId: a7f11770-5f94-445d-bd33-307cdba8f600
 *             type: RESTAURANT
 *             description: Main city branch
 *             governorateId: a7f11770-5f94-445d-bd33-307cdba8f600
 *             city: Lahore
 *             address: Main Street 12
 *             contactPhone: "+923001234567"
 *             isMain: true
 *     responses:
 *       201:
 *         description: Branch created
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Business not found
 *       409:
 *         description: Branch name already exists
 *       422:
 *         description: Validation failed
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               governorateId:
 *                 type: string
 *                 format: uuid
 *               city:
 *                 type: string
 *               address:
 *                 type: string
 *               latitude:
 *                 type: number
 *                 nullable: true
 *               longitude:
 *                 type: number
 *                 nullable: true
 *               googleMapLink:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *               contactEmail:
 *                 type: string
 *                 format: email
 *                 nullable: true
 *               contactPhone:
 *                 type: string
 *                 nullable: true
 *               whatsAppNumber:
 *                 type: string
 *                 nullable: true
 *               workingDays:
 *                 type: object
 *                 nullable: true
 *               openingTime:
 *                 type: string
 *                 nullable: true
 *               closingTime:
 *                 type: string
 *                 nullable: true
 *               emergencyContact:
 *                 type: string
 *                 nullable: true
 *               isMain:
 *                 type: boolean
 *                 example: true
 *           example:
 *             name: Downtown Branch Updated
 *             city: Lahore
 *             address: Main Street 15
 *             contactPhone: "+923001234567"
 *             openingTime: "09:00"
 *             closingTime: "23:00"
 *             isMain: true
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
 *                 enum: [PENDING, ACTIVE, INACTIVE, SUSPENDED, CLOSED]
 *                 example: ACTIVE
 *           example:
 *             status: ACTIVE
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
 *           example: a7f11770-5f94-445d-bd33-307cdba8f600
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Main branch updated
 *       401:
 *         description: Unauthorized
 */
router.patch('/:id/main', setMainBranch);

/**
 * @swagger
 * /branches/{id}/image:
 *   post:
 *     summary: Upload branch image
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
 *           example: a7f11770-5f94-445d-bd33-307cdba8f600
 *         description: Branch ID
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
 *                 description: Branch image file (e.g. PNG, JPG)
 *     responses:
 *       200:
 *         description: Branch image uploaded
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Branch not found
 */
router.post(
  '/:id/image',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.BUSINESS_OWNER),
  setUploadFolder('branches'),
  upload.single('file'),
  validateUploadedFileSignatures,
  requireUploadedFile,
  uploadBranchImage,
);

/**
 * @swagger
 * /branches/{id}/cover-image:
 *   post:
 *     summary: Upload branch cover image
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
 *           example: a7f11770-5f94-445d-bd33-307cdba8f600
 *         description: Branch ID
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
 *                 description: Branch cover image file (e.g. PNG, JPG)
 *     responses:
 *       200:
 *         description: Branch cover image uploaded
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Branch not found
 */
router.post(
  '/:id/cover-image',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.BUSINESS_OWNER),
  setUploadFolder('branches'),
  upload.single('file'),
  validateUploadedFileSignatures,
  requireUploadedFile,
  uploadBranchCoverImage,
);

module.exports = router;
