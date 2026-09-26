/**
 * Admin end-user management routes.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  listUsers,
  getUserById,
  updateUser,
  activateUser,
  deactivateUser,
  resendActivation,
  banUser,
  unbanUser,
  getUserHistory,
} = require('../controllers/admin-user.controller');
const {
  listUsersSchema,
  updateUserSchema,
  banUserSchema,
  historyQuerySchema,
} = require('../validators/admin-user.validator');
const { ROLES } = require('../../../constants');

const adminRoles = [ROLES.SUPER_ADMIN, ROLES.SUPPORT_ADMIN];

router.use(authenticate);
router.use(authorizeRoles(...adminRoles));

/**
 * @swagger
 * tags:
 *   - name: Admin Users
 *     description: Admin end-user management (activate, ban, edit, history)
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List end users
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', validate({ query: listUsersSchema }), listUsers);

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Admin Users]
 */
router.get('/:id', getUserById);

/**
 * @swagger
 * /admin/users/{id}:
 *   patch:
 *     summary: Edit user data
 *     tags: [Admin Users]
 */
router.patch('/:id', validate({ body: updateUserSchema }), updateUser);

/**
 * @swagger
 * /admin/users/{id}/activate:
 *   patch:
 *     summary: Activate user
 *     tags: [Admin Users]
 */
router.patch('/:id/activate', activateUser);

/**
 * @swagger
 * /admin/users/{id}/deactivate:
 *   patch:
 *     summary: Deactivate user
 *     tags: [Admin Users]
 */
router.patch('/:id/deactivate', deactivateUser);

/**
 * @swagger
 * /admin/users/{id}/resend-activation:
 *   post:
 *     summary: Resend activation OTP/email
 *     tags: [Admin Users]
 */
router.post('/:id/resend-activation', resendActivation);

/**
 * @swagger
 * /admin/users/{id}/ban:
 *   patch:
 *     summary: Temporary or permanent ban
 *     tags: [Admin Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [TEMPORARY, PERMANENT]
 *               bannedUntil:
 *                 type: string
 *                 format: date-time
 *               reason:
 *                 type: string
 */
router.patch('/:id/ban', validate({ body: banUserSchema }), banUser);

/**
 * @swagger
 * /admin/users/{id}/unban:
 *   patch:
 *     summary: Remove ban
 *     tags: [Admin Users]
 */
router.patch('/:id/unban', unbanUser);

/**
 * @swagger
 * /admin/users/{id}/history:
 *   get:
 *     summary: View user operations history (audit logs)
 *     tags: [Admin Users]
 */
router.get('/:id/history', validate({ query: historyQuerySchema }), getUserHistory);

module.exports = router;
