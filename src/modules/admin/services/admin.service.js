const adminRepository = require('../repositories/admin.repository');
const userRepository = require('../../../repositories/user.repository');
const roleRepository = require('../../../repositories/role.repository');
const governorateRepository = require('../../../repositories/governorate.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const { hashPassword } = require('../../../utils/password');
const AppError = require('../../../utils/AppError');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
  USER_STATUS,
} = require('../../../constants');

class AdminService {
  async createAdmin(data, createdBy, ipAddress, userAgent) {
    const { fullName, email, phoneNumber, password, role: roleName } = data;

    if (await adminRepository.findByEmail(email)) {
      throw new AppError(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    if (await adminRepository.findByPhone(phoneNumber)) {
      throw new AppError(ERROR_MESSAGES.PHONE_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    const role = await roleRepository.findByName(roleName);
    if (!role) {
      throw new AppError(ERROR_MESSAGES.ROLE_NOT_FOUND, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    const governorates = await governorateRepository.findAll();
    if (governorates.length === 0) {
      throw new AppError('No governorates found', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    const hashedPassword = await hashPassword(password);
    const passId = await governorateRepository.generatePassId(governorates[0].id);

    const admin = await adminRepository.create({
      passId,
      fullName,
      email,
      phoneNumber,
      password: hashedPassword,
      emailVerified: true,
      phoneVerified: true,
      status: USER_STATUS.ACTIVE,
      governorateId: governorates[0].id,
      roleId: role.id,
      createdBy,
    });

    await auditLogService.create({
      userId: createdBy,
      action: 'ADMIN_CREATED',
      module: 'Admins',
      ipAddress,
      userAgent,
      payload: { adminId: admin.id, email },
    });

    return { message: SUCCESS_MESSAGES.ADMIN_CREATED, admin: this.toAdminResponse(admin) };
  }

  async getAdmins(query) {
    return adminRepository.findAll(query);
  }

  async getAdminById(id) {
    const admin = await adminRepository.findById(id);
    if (!admin) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    return this.toAdminResponse(admin);
  }

  async updateAdmin(id, data, updatedBy, ipAddress, userAgent) {
    const admin = await adminRepository.findById(id);
    if (!admin) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (admin.role.name === ROLES.SUPER_ADMIN) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    if (data.email && data.email !== admin.email) {
      if (await adminRepository.findByEmail(data.email)) {
        throw new AppError(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    if (data.phoneNumber && data.phoneNumber !== admin.phoneNumber) {
      if (await adminRepository.findByPhone(data.phoneNumber)) {
        throw new AppError(ERROR_MESSAGES.PHONE_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    let roleId = admin.roleId;
    if (data.role) {
      const role = await roleRepository.findByName(data.role);
      if (!role) {
        throw new AppError(ERROR_MESSAGES.ROLE_NOT_FOUND, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
      roleId = role.id;
    }

    const updatedAdmin = await adminRepository.update(id, {
      ...data,
      roleId,
      updatedBy,
    });

    await auditLogService.create({
      userId: updatedBy,
      action: 'ADMIN_UPDATED',
      module: 'Admins',
      ipAddress,
      userAgent,
      payload: { adminId: id },
    });

    return { message: SUCCESS_MESSAGES.ADMIN_UPDATED, admin: this.toAdminResponse(updatedAdmin) };
  }

  async deleteAdmin(id, deletedBy, ipAddress, userAgent) {
    const admin = await adminRepository.findById(id);
    if (!admin) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (admin.role.name === ROLES.SUPER_ADMIN) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    await adminRepository.softDelete(id, deletedBy);

    await auditLogService.create({
      userId: deletedBy,
      action: 'ADMIN_DELETED',
      module: 'Admins',
      ipAddress,
      userAgent,
      payload: { adminId: id },
    });

    return { message: SUCCESS_MESSAGES.ADMIN_DELETED };
  }

  async updateAdminStatus(id, status, updatedBy, ipAddress, userAgent) {
    const admin = await adminRepository.findById(id);
    if (!admin) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (admin.role.name === ROLES.SUPER_ADMIN) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const updatedAdmin = await adminRepository.update(id, {
      status,
      updatedBy,
    });

    await auditLogService.create({
      userId: updatedBy,
      action: 'ADMIN_STATUS_UPDATED',
      module: 'Admins',
      ipAddress,
      userAgent,
      payload: { adminId: id, status },
    });

    return {
      message: SUCCESS_MESSAGES.ADMIN_STATUS_UPDATED,
      admin: this.toAdminResponse(updatedAdmin),
    };
  }

  async resetAdminPassword(id, newPassword, updatedBy, ipAddress, userAgent) {
    const admin = await adminRepository.findById(id);
    if (!admin) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (admin.role.name === ROLES.SUPER_ADMIN) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const hashedPassword = await hashPassword(newPassword);
    await adminRepository.update(id, {
      password: hashedPassword,
      updatedBy,
    });

    await auditLogService.create({
      userId: updatedBy,
      action: 'ADMIN_PASSWORD_RESET',
      module: 'Admins',
      ipAddress,
      userAgent,
      payload: { adminId: id },
    });

    return { message: SUCCESS_MESSAGES.ADMIN_PASSWORD_RESET };
  }

  async getOwnProfile(userId) {
    const admin = await adminRepository.findById(userId);
    if (!admin) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    return this.toAdminResponse(admin);
  }

  async updateOwnProfile(userId, data, ipAddress, userAgent) {
    const admin = await adminRepository.findById(userId);
    if (!admin) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (data.phoneNumber && data.phoneNumber !== admin.phoneNumber) {
      if (await adminRepository.findByPhone(data.phoneNumber)) {
        throw new AppError(ERROR_MESSAGES.PHONE_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    const updatedAdmin = await adminRepository.update(userId, {
      ...data,
      updatedBy: userId,
    });

    await auditLogService.create({
      userId,
      action: 'OWN_PROFILE_UPDATED',
      module: 'Admins',
      ipAddress,
      userAgent,
    });

    return { message: SUCCESS_MESSAGES.PROFILE_UPDATED, admin: this.toAdminResponse(updatedAdmin) };
  }

  async getDashboard() {
    return adminRepository.getDashboardStats();
  }

  async getNotifications(userId) {
    const notifications = await adminRepository.getNotifications(userId);
    const unreadCount = await adminRepository.getUnreadNotificationCount(userId);
    return { notifications, unreadCount };
  }

  toAdminResponse(admin) {
    const { password, ...rest } = admin;
    return rest;
  }
}

module.exports = new AdminService();
