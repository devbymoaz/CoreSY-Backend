/**
 * User Role Routes
 * Handles user role-related API endpoints
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../middlewares/rbac.middleware');
const { assignRoles, getUserRoles } = require('../controllers/user-role.controller');
const { assignRolesSchema } = require('../validators/user-role.validator');
const { ROLES } = require('../../../constants');

// All routes require authentication and admin privileges
router.use(authenticate);
router.use(authorizeRoles(ROLES.SUPER_ADMIN, ROLES.SUPPORT_ADMIN));

/**
 * @swagger
 * /users/{userId}/roles:
 *   get:
 *     summary: Get user's roles
 *     tags: [User Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User's roles
 */
router.get('/:userId/roles', getUserRoles);

/**
 * @swagger
 * /users/{userId}/roles:
 *   patch:
 *     summary: Assign roles to a user
 *     tags: [User Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roleIds]
 *             properties:
 *               roleIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Roles assigned
 */
router.patch('/:userId/roles', validate({ body: assignRolesSchema }), assignRoles);

module.exports = router;
