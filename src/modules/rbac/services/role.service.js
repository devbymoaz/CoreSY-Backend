/**
 * Role Service
 * Handles all business logic for roles
 */

const AppError = require('../../../utils/AppError');
const roleRepository = require('../repositories/role.repository');
const permissionRepository = require('../repositories/permission.repository');
const auditLogService = require('./audit-log.service');
const { ERROR_MESSAGES, SUCCESS_MESSAGES, ROLE_STATUS } = require('../../../constants');
const logger = require('../../../utils/logger');

class RoleService {
  /**
   * Create a new role
   */
  async createRole(data, userId, ipAddress, userAgent) {
    const existing = await roleRepository.findByName(data.name);
    if (existing) {
      throw new AppError(ERROR_MESSAGES.ROLE_NAME_EXISTS, 409);
    }

    const role = await roleRepository.create({
      ...data,
      status: ROLE_STATUS.ACTIVE,
      createdBy: userId,
      updatedBy: userId,
    });

    await auditLogService.logAction({
      userId,
      action: 'create',
      module: 'Roles',
      ipAddress,
      userAgent,
      payload: data,
    });

    return role;
  }

  /**
   * Get a role by ID
   */
  async getRoleById(id, includePermissions = false) {
    const role = await roleRepository.findById(id, includePermissions);
    if (!role) {
      throw new AppError(ERROR_MESSAGES.ROLE_NOT_FOUND, 404);
    }
    return role;
  }

  /**
   * Get all roles
   */
  async getAllRoles(filters) {
    return roleRepository.findAll(filters);
  }

  /**
   * Update a role
   */
  async updateRole(id, data, userId, ipAddress, userAgent) {
    const role = await roleRepository.findById(id);
    if (!role) {
      throw new AppError(ERROR_MESSAGES.ROLE_NOT_FOUND, 404);
    }

    if (role.isSystem) {
      throw new AppError(ERROR_MESSAGES.CANNOT_MODIFY_SYSTEM_ROLE, 403);
    }

    const updatedRole = await roleRepository.update(id, {
      ...data,
      updatedBy: userId,
    });

    await auditLogService.logAction({
      userId,
      action: 'update',
      module: 'Roles',
      ipAddress,
      userAgent,
      payload: data,
    });

    return updatedRole;
  }

  /**
   * Update role status
   */
  async updateRoleStatus(id, status, userId, ipAddress, userAgent) {
    const role = await roleRepository.findById(id);
    if (!role) {
      throw new AppError(ERROR_MESSAGES.ROLE_NOT_FOUND, 404);
    }

    if (role.isSystem && status === ROLE_STATUS.INACTIVE) {
      throw new AppError(ERROR_MESSAGES.CANNOT_MODIFY_SYSTEM_ROLE, 403);
    }

    const updatedRole = await roleRepository.update(id, {
      status,
      updatedBy: userId,
    });

    await auditLogService.logAction({
      userId,
      action: 'update_status',
      module: 'Roles',
      ipAddress,
      userAgent,
      payload: { status },
    });

    return updatedRole;
  }

  /**
   * Soft delete a role
   */
  async deleteRole(id, userId, ipAddress, userAgent) {
    const role = await roleRepository.findById(id);
    if (!role) {
      throw new AppError(ERROR_MESSAGES.ROLE_NOT_FOUND, 404);
    }

    if (role.isSystem) {
      throw new AppError(ERROR_MESSAGES.CANNOT_DELETE_SYSTEM_ROLE, 403);
    }

    await roleRepository.delete(id);

    await auditLogService.logAction({
      userId,
      action: 'delete',
      module: 'Roles',
      ipAddress,
      userAgent,
      payload: { roleId: id },
    });

    return true;
  }

  /**
   * Assign permissions to a role
   */
  async assignPermissions(roleId, permissionIds, userId, ipAddress, userAgent) {
    const role = await roleRepository.findById(roleId);
    if (!role) {
      throw new AppError(ERROR_MESSAGES.ROLE_NOT_FOUND, 404);
    }

    // Verify all permissions exist
    const permissions = await Promise.all(
      permissionIds.map((id) => permissionRepository.findById(id)),
    );
    const invalidIds = permissionIds.filter((_, index) => !permissions[index]);
    if (invalidIds.length > 0) {
      throw new AppError('Some permissions not found', 404);
    }

    const updatedRole = await roleRepository.assignPermissions(roleId, permissionIds);

    await auditLogService.logAction({
      userId,
      action: 'assign_permissions',
      module: 'Roles',
      ipAddress,
      userAgent,
      payload: { roleId, permissionIds },
    });

    return updatedRole;
  }

  /**
   * Remove a permission from a role
   */
  async removePermission(roleId, permissionId, userId, ipAddress, userAgent) {
    const role = await roleRepository.findById(roleId, true);
    if (!role) {
      throw new AppError(ERROR_MESSAGES.ROLE_NOT_FOUND, 404);
    }

    await roleRepository.removePermission(roleId, permissionId);

    await auditLogService.logAction({
      userId,
      action: 'remove_permission',
      module: 'Roles',
      ipAddress,
      userAgent,
      payload: { roleId, permissionId },
    });

    return true;
  }
}

module.exports = new RoleService();
