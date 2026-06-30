/**
 * Permission Service
 * Handles all business logic for permissions
 */

const AppError = require('../../../utils/AppError');
const permissionRepository = require('../repositories/permission.repository');
const auditLogService = require('./audit-log.service');
const { ERROR_MESSAGES, PERMISSION_STATUS } = require('../../../constants');

class PermissionService {
  /**
   * Create a new permission
   */
  async createPermission(data, userId, ipAddress, userAgent) {
    const existing = await permissionRepository.findBySlug(data.slug);
    if (existing) {
      throw new AppError(ERROR_MESSAGES.PERMISSION_SLUG_EXISTS, 409);
    }

    const permission = await permissionRepository.create({
      ...data,
      status: PERMISSION_STATUS.ACTIVE,
    });

    await auditLogService.logAction({
      userId,
      action: 'create',
      module: 'Permissions',
      ipAddress,
      userAgent,
      payload: data,
    });

    return permission;
  }

  /**
   * Get a permission by ID
   */
  async getPermissionById(id) {
    const permission = await permissionRepository.findById(id);
    if (!permission) {
      throw new AppError(ERROR_MESSAGES.PERMISSION_NOT_FOUND, 404);
    }
    return permission;
  }

  /**
   * Get all permissions
   */
  async getAllPermissions(filters) {
    return permissionRepository.findAll(filters);
  }

  /**
   * Update a permission
   */
  async updatePermission(id, data, userId, ipAddress, userAgent) {
    const permission = await permissionRepository.findById(id);
    if (!permission) {
      throw new AppError(ERROR_MESSAGES.PERMISSION_NOT_FOUND, 404);
    }

    const updatedPermission = await permissionRepository.update(id, data);

    await auditLogService.logAction({
      userId,
      action: 'update',
      module: 'Permissions',
      ipAddress,
      userAgent,
      payload: data,
    });

    return updatedPermission;
  }

  /**
   * Soft delete a permission
   */
  async deletePermission(id, userId, ipAddress, userAgent) {
    const permission = await permissionRepository.findById(id);
    if (!permission) {
      throw new AppError(ERROR_MESSAGES.PERMISSION_NOT_FOUND, 404);
    }

    await permissionRepository.delete(id);

    await auditLogService.logAction({
      userId,
      action: 'delete',
      module: 'Permissions',
      ipAddress,
      userAgent,
      payload: { permissionId: id },
    });

    return true;
  }
}

module.exports = new PermissionService();
