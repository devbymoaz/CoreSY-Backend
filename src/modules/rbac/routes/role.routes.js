/**
 * Role Routes
 * Handles role-related API endpoints
 */

const express = require('express');
const router = express.Router();
const { z } = require('zod');
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../middlewares/rbac.middleware');
const {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  updateRoleStatus,
  deleteRole,
  assignPermissions,
  removePermission,
} = require('../controllers/role.controller');
const {
  createRoleSchema,
  updateRoleSchema,
  updateRoleStatusSchema,
  assignPermissionsSchema,
  listRolesSchema,
} = require('../validators/role.validator');
const { ROLES } = require('../../../constants');

// All routes require authentication and admin privileges
router.use(authenticate);
router.use(authorizeRoles(ROLES.SUPER_ADMIN, ROLES.SUPPORT_ADMIN));

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
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
 *         description: Search roles by name or description
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         description: Filter by status
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *         description: Sort by field
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of roles
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', validate({ query: listRolesSchema }), getRoles);

/**
 * @swagger
 * /roles/{id}:
 *   get:
 *     summary: Get a role by ID
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Role ID
 *       - in: query
 *         name: include_permissions
 *         schema:
 *           type: boolean
 *         description: Include permissions
 *     responses:
 *       200:
 *         description: Role details
 *       404:
 *         description: Role not found
 */
router.get('/:id', getRoleById);

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Role'
 *     responses:
 *       201:
 *         description: Role created
 *       409:
 *         description: Role already exists
 */
router.post('/', validate({ body: createRoleSchema }), createRole);

/**
 * @swagger
 * /roles/{id}:
 *   patch:
 *     summary: Update a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: Role updated
 *       403:
 *         description: Cannot modify system role
 */
router.patch('/:id', validate({ body: updateRoleSchema }), updateRole);

/**
 * @swagger
 * /roles/{id}/status:
 *   patch:
 *     summary: Update role status
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Role ID
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
 *                 enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: Role status updated
 */
router.patch(
  '/:id/status',
  validate({ body: updateRoleStatusSchema }),
  updateRoleStatus
);

/**
 * @swagger
 * /roles/{id}:
 *   delete:
 *     summary: Delete a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role deleted
 *       403:
 *         description: Cannot delete system role
 */
router.delete('/:id', deleteRole);

/**
 * @swagger
 * /roles/{id}/permissions:
 *   get:
 *     summary: Get permissions for a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role permissions
 */
router.get('/:id/permissions', (req, res) => getRoleById(req, res));

/**
 * @swagger
 * /roles/{id}/permissions:
 *   patch:
 *     summary: Assign permissions to a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [permissionIds]
 *             properties:
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Permissions assigned
 */
router.patch(
  '/:id/permissions',
  validate({ body: assignPermissionsSchema }),
  assignPermissions
);

/**
 * @swagger
 * /roles/{id}/permissions:
 *   post:
 *     summary: Assign permissions to a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [permissionIds]
 *             properties:
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Permissions assigned
 */
router.post(
  '/:id/permissions',
  validate({ body: assignPermissionsSchema }),
  assignPermissions
);

/**
 * @swagger
 * /roles/{id}/permissions/{permissionId}:
 *   delete:
 *     summary: Remove a permission from a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Role ID
 *       - in: path
 *         name: permissionId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Permission ID
 *     responses:
 *       200:
 *         description: Permission removed
 */
router.delete('/:id/permissions/:permissionId', removePermission);

module.exports = router;
