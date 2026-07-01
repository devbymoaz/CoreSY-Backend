const cashierRepository = require('../repositories/cashier.repository');
const businessRepository = require('../../business/repositories/business.repository');
const branchRepository = require('../../branch/repositories/branch.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const AppError = require('../../../utils/AppError');
const { hashPassword, comparePassword } = require('../../../utils/password');
const { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES, ROLES } = require('../../../constants');

class CashierService {
  async generateEmployeeId() {
    const { cashiers } = await cashierRepository.findAll({
      limit: 1,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    let nextNumber = 1;
    if (cashiers.length > 0 && cashiers[0].employeeId) {
      const latestCode = cashiers[0].employeeId;
      const match = latestCode.match(/^CSH-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    return `CSH-${String(nextNumber).padStart(6, '0')}`;
  }

  async createCashier(data, userId, ipAddress, userAgent, user) {
    const business = await businessRepository.findById(data.businessId);
    if (!business) {
      throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const branch = await branchRepository.findById(data.branchId);
    if (!branch) {
      throw new AppError(ERROR_MESSAGES.BRANCH_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (user.roles.includes(ROLES.BUSINESS_OWNER) && business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const existingEmail = await cashierRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new AppError(ERROR_MESSAGES.CASHIER_EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    const existingPhone = await cashierRepository.findByPhoneNumber(data.phoneNumber);
    if (existingPhone) {
      throw new AppError(ERROR_MESSAGES.CASHIER_PHONE_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    const employeeId = await this.generateEmployeeId();
    const hashedPassword = await hashPassword(data.password);

    const cashierData = {
      fullName: data.fullName,
      employeeId,
      email: data.email,
      phoneNumber: data.phoneNumber,
      password: hashedPassword,
      businessId: data.businessId,
      branchId: data.branchId,
      createdBy: userId,
    };

    if (data.joiningDate) {
      cashierData.joiningDate = new Date(data.joiningDate);
    }

    const cashier = await cashierRepository.create(cashierData);

    await auditLogService.create({
      userId,
      action: 'CASHIER_CREATED',
      module: 'Cashiers',
      ipAddress,
      userAgent,
      payload: { cashierId: cashier.id, employeeId: cashier.employeeId },
    });

    return { message: SUCCESS_MESSAGES.CASHIER_CREATED, cashier };
  }

  async getCashiers(query, user) {
    return cashierRepository.findAll(query);
  }

  async getCashierById(id, user) {
    const cashier = await cashierRepository.findById(id);
    if (!cashier) {
      throw new AppError(ERROR_MESSAGES.CASHIER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (user.roles.includes(ROLES.BUSINESS_OWNER) && cashier.business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    return cashier;
  }

  async getBusinessCashiers(businessId, user, options = {}) {
    const business = await businessRepository.findById(businessId);
    if (!business) {
      throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (user.roles.includes(ROLES.BUSINESS_OWNER) && business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    return cashierRepository.findByBusinessId(businessId, options);
  }

  async getBranchCashiers(branchId, user, options = {}) {
    const branch = await branchRepository.findById(branchId);
    if (!branch) {
      throw new AppError(ERROR_MESSAGES.BRANCH_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (user.roles.includes(ROLES.BUSINESS_OWNER) && branch.business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    return cashierRepository.findByBranchId(branchId, options);
  }

  async updateCashier(id, data, userId, ipAddress, userAgent, user) {
    const cashier = await cashierRepository.findById(id);
    if (!cashier) {
      throw new AppError(ERROR_MESSAGES.CASHIER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (user.roles.includes(ROLES.BUSINESS_OWNER) && cashier.business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    if (data.email && data.email !== cashier.email) {
      const existingEmail = await cashierRepository.findByEmail(data.email);
      if (existingEmail) {
        throw new AppError(ERROR_MESSAGES.CASHIER_EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    if (data.phoneNumber && data.phoneNumber !== cashier.phoneNumber) {
      const existingPhone = await cashierRepository.findByPhoneNumber(data.phoneNumber);
      if (existingPhone) {
        throw new AppError(ERROR_MESSAGES.CASHIER_PHONE_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    const updateData = { ...data, updatedBy: userId };
    if (data.joiningDate) {
      updateData.joiningDate = new Date(data.joiningDate);
    }

    const updatedCashier = await cashierRepository.update(id, updateData);

    await auditLogService.create({
      userId,
      action: 'CASHIER_UPDATED',
      module: 'Cashiers',
      ipAddress,
      userAgent,
      payload: { cashierId: id },
    });

    return { message: SUCCESS_MESSAGES.CASHIER_UPDATED, cashier: updatedCashier };
  }

  async deleteCashier(id, userId, ipAddress, userAgent, user) {
    const cashier = await cashierRepository.findById(id);
    if (!cashier) {
      throw new AppError(ERROR_MESSAGES.CASHIER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (user.roles.includes(ROLES.BUSINESS_OWNER) && cashier.business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    await cashierRepository.softDelete(id, userId);

    await auditLogService.create({
      userId,
      action: 'CASHIER_DELETED',
      module: 'Cashiers',
      ipAddress,
      userAgent,
      payload: { cashierId: id },
    });

    return { message: SUCCESS_MESSAGES.CASHIER_DELETED };
  }

  async updateCashierStatus(id, status, userId, ipAddress, userAgent) {
    const cashier = await cashierRepository.findById(id);
    if (!cashier) {
      throw new AppError(ERROR_MESSAGES.CASHIER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const updatedCashier = await cashierRepository.update(id, { status, updatedBy: userId });

    await auditLogService.create({
      userId,
      action: 'CASHIER_STATUS_UPDATED',
      module: 'Cashiers',
      ipAddress,
      userAgent,
      payload: { cashierId: id, status },
    });

    return {
      message: SUCCESS_MESSAGES.CASHIER_STATUS_UPDATED,
      cashier: updatedCashier,
    };
  }

  async resetCashierPassword(id, newPassword, userId, ipAddress, userAgent) {
    const cashier = await cashierRepository.findById(id);
    if (!cashier) {
      throw new AppError(ERROR_MESSAGES.CASHIER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const hashedPassword = await hashPassword(newPassword);
    await cashierRepository.update(id, { password: hashedPassword, updatedBy: userId });

    await auditLogService.create({
      userId,
      action: 'CASHIER_PASSWORD_RESET',
      module: 'Cashiers',
      ipAddress,
      userAgent,
      payload: { cashierId: id },
    });

    return {
      message: SUCCESS_MESSAGES.CASHIER_PASSWORD_RESET,
    };
  }

  async getCashierProfile(cashierId) {
    const cashier = await cashierRepository.findById(cashierId);
    if (!cashier) {
      throw new AppError(ERROR_MESSAGES.CASHIER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    return cashier;
  }

  async updateCashierProfile(id, data, userId, ipAddress, userAgent) {
    const cashier = await cashierRepository.findById(id);
    if (!cashier) {
      throw new AppError(ERROR_MESSAGES.CASHIER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (data.phoneNumber && data.phoneNumber !== cashier.phoneNumber) {
      const existingPhone = await cashierRepository.findByPhoneNumber(data.phoneNumber);
      if (existingPhone) {
        throw new AppError(ERROR_MESSAGES.CASHIER_PHONE_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    const updatedCashier = await cashierRepository.update(id, { ...data, updatedBy: userId });

    await auditLogService.create({
      userId,
      action: 'CASHIER_PROFILE_UPDATED',
      module: 'Cashiers',
      ipAddress,
      userAgent,
      payload: { cashierId: id },
    });

    return { message: SUCCESS_MESSAGES.PROFILE_UPDATED, cashier: updatedCashier };
  }

  async changeCashierPassword(id, currentPassword, newPassword, userId, ipAddress, userAgent) {
    const cashier = await cashierRepository.findById(id);
    if (!cashier) {
      throw new AppError(ERROR_MESSAGES.CASHIER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const passwordValid = await comparePassword(currentPassword, cashier.password);
    if (!passwordValid) {
      throw new AppError(ERROR_MESSAGES.CURRENT_PASSWORD_INCORRECT, HTTP_STATUS.UNAUTHORIZED);
    }

    const hashedPassword = await hashPassword(newPassword);
    await cashierRepository.update(id, { password: hashedPassword, updatedBy: userId });

    await auditLogService.create({
      userId,
      action: 'CASHIER_PASSWORD_CHANGED',
      module: 'Cashiers',
      ipAddress,
      userAgent,
      payload: { cashierId: id },
    });

    return { message: SUCCESS_MESSAGES.PASSWORD_CHANGED };
  }

  async getDashboardStats() {
    return cashierRepository.getDashboardStats();
  }
}

module.exports = new CashierService();
