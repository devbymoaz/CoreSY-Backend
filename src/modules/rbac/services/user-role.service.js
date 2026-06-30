/**
 * User Role Service
 * Handles all business logic for user-role relationships
 */

const AppError = require('../../../utils/AppError');
const userRoleRepository = require('../repositories/user-role.repository');
const roleRepository = require('../repositories/role.repository');
const auditLogService = require('./audit-log.service');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../../../constants');

class UserRoleService {
  /**
   * Assign roles to a user
   */
  async assignRoles(userId, roleIds, currentUserId, ipAddress, userAgent) {
    // Verify all roles exist
    const roles = await Promise.all(
      roleIds.map((id) => roleRepository.findById(id))
    );
    const invalidIds = roleIds.filter((_, index) => !roles[index]);
    if (invalidIds.length > 0) {
      throw new AppError('Some roles not found', 404);
    }

    const userRoles = await userRoleRepository.assignRoles(userId, roleIds);

    await auditLogService.logAction({
      userId: currentUserId,
      action: 'assign_roles',
      module: 'UserRoles',
      ipAddress,
      userAgent,
      payload: { userId, roleIds },
    });

    return userRoles;
  }

  /**
   * Get all roles for a user
   */
  async getUserRoles(userId) {
    return userRoleRepository.getUserRoles(userId);
  }
}

module.exports = new UserRoleService();
