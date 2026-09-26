/**
 * Admin end-user management service.
 */

const adminUserRepository = require('../repositories/admin-user.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const authService = require('../../../services/auth.service');
const AppError = require('../../../utils/AppError');
const { prisma } = require('../../../prisma');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  USER_STATUS,
  BAN_TYPE,
  PERMISSION_MODULES,
} = require('../../../constants');

class AdminUserService {
  _toResponse(user) {
    if (!user) return null;
    const {
      password,
      ...safe
    } = user;
    return {
      ...safe,
      roles: [
        user.role?.name,
        ...(user.userRoles || []).map((ur) => ur.role?.name),
      ].filter(Boolean),
    };
  }

  async listUsers(query) {
    const result = await adminUserRepository.findAll(query);
    return {
      users: result.users.map((u) => this._toResponse(u)),
      pagination: result.pagination,
    };
  }

  async getUserById(id) {
    const user = await adminUserRepository.findById(id);
    if (!user) throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    return this._toResponse(user);
  }

  async updateUser(id, data, adminId, ipAddress, userAgent) {
    const user = await adminUserRepository.findById(id);
    if (!user) throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (data.email && data.email !== user.email) {
      const exists = await prisma.user.findFirst({
        where: { email: data.email, id: { not: id }, deletedAt: null },
      });
      if (exists) throw new AppError(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    if (data.phoneNumber && data.phoneNumber !== user.phoneNumber) {
      const exists = await prisma.user.findFirst({
        where: { phoneNumber: data.phoneNumber, id: { not: id }, deletedAt: null },
      });
      if (exists) throw new AppError(ERROR_MESSAGES.PHONE_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    if (data.governorateId) {
      const gov = await prisma.governorate.findUnique({ where: { id: data.governorateId } });
      if (!gov) throw new AppError(ERROR_MESSAGES.GOVERNORATE_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
    }

    const updateData = {
      updatedBy: adminId,
    };
    if (data.fullName != null) updateData.fullName = data.fullName;
    if (data.email != null) updateData.email = data.email;
    if (data.phoneNumber != null) updateData.phoneNumber = data.phoneNumber;
    if (data.smartAssistantName != null) updateData.smartAssistantName = data.smartAssistantName;
    if (data.profileImage != null) updateData.profileImage = data.profileImage;
    if (data.governorateId != null) updateData.governorateId = data.governorateId;
    if (data.subscription != null) updateData.subscription = data.subscription;

    const updated = await adminUserRepository.update(id, updateData);

    await auditLogService.create({
      userId: adminId,
      action: 'USER_UPDATED',
      module: PERMISSION_MODULES.USERS || 'Users',
      ipAddress,
      userAgent,
      payload: { targetUserId: id, fields: Object.keys(updateData) },
    });

    return { message: SUCCESS_MESSAGES.USER_UPDATED, user: this._toResponse(updated) };
  }

  async activateUser(id, adminId, ipAddress, userAgent) {
    const user = await adminUserRepository.findById(id);
    if (!user) throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    if (user.status === USER_STATUS.ACTIVE && !user.banType) {
      throw new AppError(ERROR_MESSAGES.USER_ALREADY_ACTIVE, HTTP_STATUS.BAD_REQUEST);
    }

    const updated = await adminUserRepository.update(id, {
      status: USER_STATUS.ACTIVE,
      emailVerified: true,
      banType: null,
      bannedUntil: null,
      banReason: null,
      bannedAt: null,
      bannedBy: null,
      updatedBy: adminId,
    });

    await auditLogService.create({
      userId: adminId,
      action: 'USER_ACTIVATED',
      module: PERMISSION_MODULES.USERS || 'Users',
      ipAddress,
      userAgent,
      payload: { targetUserId: id },
    });

    return { message: SUCCESS_MESSAGES.USER_ACTIVATED, user: this._toResponse(updated) };
  }

  async deactivateUser(id, adminId, ipAddress, userAgent) {
    const user = await adminUserRepository.findById(id);
    if (!user) throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    if (user.status === USER_STATUS.DEACTIVATED) {
      throw new AppError(ERROR_MESSAGES.USER_ALREADY_DEACTIVATED, HTTP_STATUS.BAD_REQUEST);
    }

    const updated = await adminUserRepository.update(id, {
      status: USER_STATUS.DEACTIVATED,
      updatedBy: adminId,
    });

    await auditLogService.create({
      userId: adminId,
      action: 'USER_DEACTIVATED',
      module: PERMISSION_MODULES.USERS || 'Users',
      ipAddress,
      userAgent,
      payload: { targetUserId: id },
    });

    return { message: SUCCESS_MESSAGES.USER_DEACTIVATED, user: this._toResponse(updated) };
  }

  async resendActivation(id, adminId, ipAddress, userAgent) {
    const user = await adminUserRepository.findById(id);
    if (!user) throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (user.emailVerified && user.status === USER_STATUS.ACTIVE) {
      throw new AppError(ERROR_MESSAGES.USER_ALREADY_ACTIVE, HTTP_STATUS.BAD_REQUEST);
    }

    // Force-send OTP email (public resend silently skips already-verified users)
    const result = await authService.adminResendActivation(user);

    await auditLogService.create({
      userId: adminId,
      action: 'USER_ACTIVATION_RESENT',
      module: PERMISSION_MODULES.USERS || 'Users',
      ipAddress,
      userAgent,
      payload: { targetUserId: id, email: user.email, emailSent: result.emailSent },
    });

    return result;
  }

  async banUser(id, data, adminId, ipAddress, userAgent) {
    const user = await adminUserRepository.findById(id);
    if (!user) throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (user.banType && user.status === USER_STATUS.SUSPENDED) {
      throw new AppError(ERROR_MESSAGES.USER_ALREADY_BANNED, HTTP_STATUS.BAD_REQUEST);
    }

    const banType = data.type || BAN_TYPE.PERMANENT;
    if (banType === BAN_TYPE.TEMPORARY && !data.bannedUntil) {
      throw new AppError(ERROR_MESSAGES.TEMP_BAN_REQUIRES_UNTIL, HTTP_STATUS.BAD_REQUEST);
    }

    const bannedUntil =
      banType === BAN_TYPE.TEMPORARY ? new Date(data.bannedUntil) : null;

    if (bannedUntil && bannedUntil <= new Date()) {
      throw new AppError('bannedUntil must be in the future.', HTTP_STATUS.BAD_REQUEST);
    }

    const updated = await adminUserRepository.update(id, {
      status: USER_STATUS.SUSPENDED,
      banType,
      bannedUntil,
      banReason: data.reason || null,
      bannedAt: new Date(),
      bannedBy: adminId,
      updatedBy: adminId,
    });

    await auditLogService.create({
      userId: adminId,
      action: 'USER_BANNED',
      module: PERMISSION_MODULES.USERS || 'Users',
      ipAddress,
      userAgent,
      payload: { targetUserId: id, banType, bannedUntil, reason: data.reason },
    });

    return { message: SUCCESS_MESSAGES.USER_BANNED, user: this._toResponse(updated) };
  }

  async unbanUser(id, adminId, ipAddress, userAgent) {
    const user = await adminUserRepository.findById(id);
    if (!user) throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (!user.banType && user.status !== USER_STATUS.SUSPENDED) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_BANNED, HTTP_STATUS.BAD_REQUEST);
    }

    const updated = await adminUserRepository.update(id, {
      status: USER_STATUS.ACTIVE,
      banType: null,
      bannedUntil: null,
      banReason: null,
      bannedAt: null,
      bannedBy: null,
      updatedBy: adminId,
    });

    await auditLogService.create({
      userId: adminId,
      action: 'USER_UNBANNED',
      module: PERMISSION_MODULES.USERS || 'Users',
      ipAddress,
      userAgent,
      payload: { targetUserId: id },
    });

    return { message: SUCCESS_MESSAGES.USER_UNBANNED, user: this._toResponse(updated) };
  }

  async getUserHistory(id, query) {
    const user = await adminUserRepository.findById(id);
    if (!user) throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    return adminUserRepository.findHistory(id, query);
  }
}

module.exports = new AdminUserService();
