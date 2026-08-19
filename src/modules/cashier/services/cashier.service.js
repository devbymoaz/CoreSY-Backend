const cashierRepository = require('../repositories/cashier.repository');
const businessRepository = require('../../business/repositories/business.repository');
const branchRepository = require('../../branch/repositories/branch.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const { removePublicUpload } = require('../../../middlewares/upload.middleware');
const AppError = require('../../../utils/AppError');
const { hashPassword, comparePassword } = require('../../../utils/password');
const { generateAccessToken, generateRefreshToken } = require('../../../utils/jwt');
const config = require('../../../config');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
  CASHIER_STATUS,
} = require('../../../constants');

class CashierService {
  _toPublicCashier(cashier) {
    if (!cashier) {
      return cashier;
    }
    const safeCashier = { ...cashier };
    delete safeCashier.password;
    return safeCashier;
  }

  async generateEmployeeId() {
    const prefix = 'CSH';
    const existingIds = await cashierRepository.findEmployeeIdsByPrefix(prefix);

    let maxNumber = 0;
    const codePattern = new RegExp(`^${prefix}-(\\d+)$`);
    for (const employeeId of existingIds) {
      const match = employeeId.match(codePattern);
      if (match) {
        maxNumber = Math.max(maxNumber, parseInt(match[1], 10));
      }
    }

    return `${prefix}-${String(maxNumber + 1).padStart(6, '0')}`;
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

    const hashedPassword = await hashPassword(data.password);
    const cashierData = {
      fullName: data.fullName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      password: hashedPassword,
      businessId: data.businessId,
      branchId: data.branchId,
      createdBy: userId,
      status: CASHIER_STATUS.ACTIVE,
    };

    if (data.joiningDate) {
      cashierData.joiningDate = new Date(data.joiningDate);
    }

    let cashier;
    let lastError;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const employeeId = await this.generateEmployeeId();
      try {
        cashier = await cashierRepository.create({
          ...cashierData,
          employeeId,
        });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        const target = error.meta?.target;
        const targetText = Array.isArray(target) ? target.join(',') : String(target || '');
        const isEmployeeIdConflict =
          error.code === 'P2002' && targetText.toLowerCase().includes('employee_id');
        if (!isEmployeeIdConflict) {
          throw error;
        }
      }
    }

    if (!cashier) {
      throw (
        lastError ||
        new AppError(ERROR_MESSAGES.CASHIER_EMPLOYEE_ID_ALREADY_EXISTS, HTTP_STATUS.CONFLICT)
      );
    }

    await auditLogService.create({
      userId,
      action: 'CASHIER_CREATED',
      module: 'Cashiers',
      ipAddress,
      userAgent,
      payload: { cashierId: cashier.id, employeeId: cashier.employeeId },
    });

    return { message: SUCCESS_MESSAGES.CASHIER_CREATED, cashier: this._toPublicCashier(cashier) };
  }

  async login(data) {
    const identifier = data.identifier.includes('@')
      ? data.identifier.toLowerCase().trim()
      : data.identifier.trim();

    const cashier = await cashierRepository.findByEmailOrPhone(identifier);
    if (!cashier) {
      throw new AppError(ERROR_MESSAGES.CASHIER_INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    const isValid = await comparePassword(data.password, cashier.password);
    if (!isValid) {
      throw new AppError(ERROR_MESSAGES.CASHIER_INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    if (cashier.status === CASHIER_STATUS.SUSPENDED) {
      throw new AppError(ERROR_MESSAGES.CASHIER_SUSPENDED, HTTP_STATUS.FORBIDDEN);
    }

    if (cashier.status !== CASHIER_STATUS.ACTIVE && cashier.status !== CASHIER_STATUS.PENDING) {
      throw new AppError(ERROR_MESSAGES.CASHIER_NOT_ACTIVE, HTTP_STATUS.FORBIDDEN);
    }

    const payload = {
      sub: cashier.id,
      email: cashier.email,
      role: ROLES.CASHIER,
      type: 'cashier',
      employeeId: cashier.employeeId,
      businessId: cashier.businessId,
      branchId: cashier.branchId,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({
      sub: cashier.id,
      type: 'cashier_refresh',
    });

    await cashierRepository.update(cashier.id, { lastLogin: new Date() });
    const safeCashier = this._toPublicCashier(await cashierRepository.findById(cashier.id));

    return {
      message: SUCCESS_MESSAGES.CASHIER_LOGIN_SUCCESS,
      accessToken,
      refreshToken,
      expiresIn: config.jwt.expiresIn,
      cashier: safeCashier,
    };
  }

  async getCashiers(query, _user) {
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
    await removePublicUpload(cashier.profileImage);

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
    return this._toPublicCashier(cashier);
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

    return {
      message: SUCCESS_MESSAGES.PROFILE_UPDATED,
      cashier: this._toPublicCashier(updatedCashier),
    };
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

  async uploadProfileImage(id, imageUrl, userId, ipAddress, userAgent, user) {
    const cashier = await cashierRepository.findById(id);
    if (!cashier) {
      throw new AppError(ERROR_MESSAGES.CASHIER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    if (!user.roles.includes(ROLES.SUPER_ADMIN) && cashier.business.ownerId !== userId) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const updatedCashier = await cashierRepository.update(id, {
      profileImage: imageUrl,
      updatedBy: userId,
    });
    await removePublicUpload(cashier.profileImage);

    await auditLogService.create({
      userId,
      action: 'CASHIER_PROFILE_IMAGE_UPLOADED',
      module: 'Cashiers',
      ipAddress,
      userAgent,
      payload: { cashierId: id, profileImage: imageUrl },
    });

    return {
      message: SUCCESS_MESSAGES.CASHIER_PROFILE_IMAGE_UPLOADED,
      cashier: updatedCashier,
    };
  }
}

module.exports = new CashierService();
