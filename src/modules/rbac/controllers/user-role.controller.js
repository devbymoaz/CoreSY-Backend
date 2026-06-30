/**
 * User Role Controller
 * Handles user role-related HTTP requests
 */

const asyncHandler = require('../../../utils/asyncHandler');
const { sendSuccess } = require('../../../helpers/response.helper');
const userRoleService = require('../services/user-role.service');
const { SUCCESS_MESSAGES } = require('../../../constants');

/**
 * Assign roles to a user
 */
const assignRoles = asyncHandler(async (req, res) => {
  const userRoles = await userRoleService.assignRoles(
    req.params.userId,
    req.body.roleIds,
    req.user.id,
    req.ip,
    req.get('user-agent'),
  );

  return sendSuccess(res, {
    message: SUCCESS_MESSAGES.ROLES_ASSIGNED,
    data: userRoles,
  });
});

/**
 * Get all roles for a user
 */
const getUserRoles = asyncHandler(async (req, res) => {
  const userRoles = await userRoleService.getUserRoles(req.params.userId);

  return sendSuccess(res, {
    message: 'User roles retrieved successfully',
    data: userRoles,
  });
});

module.exports = {
  assignRoles,
  getUserRoles,
};
