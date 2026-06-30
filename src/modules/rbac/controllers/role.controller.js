/**
 * Role Controller
 * Handles role-related HTTP requests
 */

const asyncHandler = require('../../../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../../../helpers/response.helper');
const roleService = require('../services/role.service');
const { SUCCESS_MESSAGES } = require('../../../constants');

/**
 * Create a new role
 */
const createRole = asyncHandler(async (req, res) => {
  const role = await roleService.createRole(
    req.body,
    req.user.id,
    req.ip,
    req.get('user-agent')
  );

  return sendCreated(res, {
    message: SUCCESS_MESSAGES.ROLE_CREATED,
    data: role,
  });
});

/**
 * Get all roles
 */
const getRoles = asyncHandler(async (req, res) => {
  const result = await roleService.getAllRoles(req.query);

  return sendSuccess(res, {
    message: 'Roles retrieved successfully',
    data: result.roles,
    meta: result.pagination,
  });
});

/**
 * Get a single role by ID
 */
const getRoleById = asyncHandler(async (req, res) => {
  const includePermissions = req.query.include_permissions === 'true';
  const role = await roleService.getRoleById(req.params.id, includePermissions);

  return sendSuccess(res, {
    message: 'Role retrieved successfully',
    data: role,
  });
});

/**
 * Update a role
 */
const updateRole = asyncHandler(async (req, res) => {
  const role = await roleService.updateRole(
    req.params.id,
    req.body,
    req.user.id,
    req.ip,
    req.get('user-agent')
  );

  return sendSuccess(res, {
    message: SUCCESS_MESSAGES.ROLE_UPDATED,
    data: role,
  });
});

/**
 * Update role status
 */
const updateRoleStatus = asyncHandler(async (req, res) => {
  const role = await roleService.updateRoleStatus(
    req.params.id,
    req.body.status,
    req.user.id,
    req.ip,
    req.get('user-agent')
  );

  return sendSuccess(res, {
    message: SUCCESS_MESSAGES.ROLE_STATUS_UPDATED,
    data: role,
  });
});

/**
 * Delete a role
 */
const deleteRole = asyncHandler(async (req, res) => {
  await roleService.deleteRole(
    req.params.id,
    req.user.id,
    req.ip,
    req.get('user-agent')
  );

  return sendSuccess(res, {
    message: SUCCESS_MESSAGES.ROLE_DELETED,
  });
});

/**
 * Assign permissions to a role
 */
const assignPermissions = asyncHandler(async (req, res) => {
  const role = await roleService.assignPermissions(
    req.params.id,
    req.body.permissionIds,
    req.user.id,
    req.ip,
    req.get('user-agent')
  );

  return sendSuccess(res, {
    message: SUCCESS_MESSAGES.PERMISSIONS_ASSIGNED,
    data: role,
  });
});

/**
 * Remove a permission from a role
 */
const removePermission = asyncHandler(async (req, res) => {
  await roleService.removePermission(
    req.params.id,
    req.params.permissionId,
    req.user.id,
    req.ip,
    req.get('user-agent')
  );

  return sendSuccess(res, {
    message: 'Permission removed from role successfully',
  });
});

module.exports = {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  updateRoleStatus,
  deleteRole,
  assignPermissions,
  removePermission,
};
