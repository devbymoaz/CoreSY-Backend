/**
 * Permission Routes
 * Handles permission-related API endpoints
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../middlewares/rbac.middleware');
const {
  createPermission,
  getPermissions,
  getPermissionById,
  updatePermission,
  deletePermission,
} = require('../controllers/permission.controller');
const {
  createPermissionSchema,
  updatePermissionSchema,
  listPermissionsSchema,
} = require('../validators/permission.validator');
const { ROLES } = require('../../../constants');

// All routes require authentication and admin privileges
router.use(authenticate);
router.use(authorizeRoles(ROLES.SUPER_ADMIN, ROLES.SUPPORT_ADMIN));

/**
 * @swagger
 * /permissions:
 *   get:
 *     summary: Get all permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search permissions
 *       - in: query
 *         name: module
 *         schema:
 *           type: string
 *         description: Filter by module
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of permissions
 */
router.get('/', validate({ query: listPermissionsSchema }), getPermissions);

/**
 * @swagger
 * /permissions/{id}:
 *   get:
 *     summary: Get a permission by ID
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Permission ID
 *     responses:
 *       200:
 *         description: Permission details
 */
router.get('/:id', getPermissionById);

/**
 * @swagger
 * /permissions:
 *   post:
 *     summary: Create a new permission
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [module, name, slug]
 *             properties:
 *               module:
 *                 type: string
 *                 enum: [Users, Businesses, Branches, Services, Products, Orders, Slots, Bookings, Drivers, Cashiers, Wallet, Payments, Subscriptions, Notifications, Reports, Analytics, Settings, Roles, Permissions, Content, Support, Finance, Points, Reviews, QR]
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               slug:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 description: Must contain a module prefix (e.g., users.create)
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 nullable: true
 *           example:
 *             module: Users
 *             name: Create User
 *             slug: users.create
 *             description: Create new users
 *     responses:
 *       201:
 *         description: Permission created
 */
router.post('/', validate({ body: createPermissionSchema }), createPermission);

/**
 * @swagger
 * /permissions/{id}:
 *   patch:
 *     summary: Update a permission
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Permission ID
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
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 nullable: true
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *           example:
 *             name: Update User
 *             description: Update existing users
 *             status: ACTIVE
 *     responses:
 *       200:
 *         description: Permission updated
 */
router.patch('/:id', validate({ body: updatePermissionSchema }), updatePermission);

/**
 * @swagger
 * /permissions/{id}:
 *   delete:
 *     summary: Delete a permission
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Permission ID
 *     responses:
 *       200:
 *         description: Permission deleted
 */
router.delete('/:id', deletePermission);

module.exports = router;
