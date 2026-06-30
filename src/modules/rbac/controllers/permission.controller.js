/**
 * Permission Controller
 * Handles permission-related HTTP requests
 */

const asyncHandler = require('../../../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../../../helpers/response.helper');
const permissionService = require('../services/permission.service');
const { SUCCESS_MESSAGES } = require('../../../constants');

/**
 * Create a new permission
 */
const createPermission = asyncHandler(async (req, res) => {
  const permission = await permissionService.createPermission(
    req.body,
    req.user.id,
    req.ip,
    req.get('user-agent')
  );

  return sendCreated(res, {
    message: SUCCESS_MESSAGES.PERMISSION_CREATED,
    data: permission,
  });
});

/**
 * Get all permissions
 */
const getPermissions = asyncHandler(async (req, res) => {
  const result = await permissionService.getAllPermissions(req.query);

  return sendSuccess(res, {
    message: 'Permissions retrieved successfully',
    data: result.permissions,
    meta: result.pagination,
  });
});

/**
 * Get a single permission by ID
 */
const getPermissionById = asyncHandler(async (req, res) => {
  const permission = await permissionService.getPermissionById(req.params.id);

  return sendSuccess(res, {
    message: 'Permission retrieved successfully',
    data: permission,
  });
});

/**
 * Update a permission
 */
const updatePermission = asyncHandler(async (req, res) => {
  const permission = await permissionService.updatePermission(
    req.params.id,
    req.body,
    req.user.id,
    req.ip,
    req.get('user-agent')
  );

  return sendSuccess(res, {
    message: SUCCESS_MESSAGES.PERMISSION_UPDATED,
    data: permission,
  });
});

/**
 * Delete a permission
 */
const deletePermission = asyncHandler(async (req, res) => {
  await permissionService.deletePermission(
    req.params.id,
    req.user.id,
    req.ip,
    req.get('user-agent')
  );

  return sendSuccess(res, {
    message: SUCCESS_MESSAGES.PERMISSION_DELETED,
  });
});

module.exports = {
  createPermission,
  getPermissions,
  getPermissionById,
  updatePermission,
  deletePermission,
};
