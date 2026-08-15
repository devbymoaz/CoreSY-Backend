const businessRepository = require('../repositories/business.repository');
const governorateRepository = require('../../../repositories/governorate.repository');
const userRepository = require('../../../repositories/user.repository');
const roleRepository = require('../../../repositories/role.repository');
const userRoleRepository = require('../../rbac/repositories/user-role.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const { hashPassword } = require('../../../utils/password');
const AppError = require('../../../utils/AppError');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
  BUSINESS_STATUS,
  USER_STATUS,
  SUBSCRIPTION_TIERS,
} = require('../../../constants');

class BusinessService {
  /**
   * Resolve or provision the login account used by a business owner.
   * Roles are assigned server-side and are never trusted from login input.
   */
  async resolveOwnerAccount({
    ownerEmail,
    ownerName,
    ownerPhone,
    ownerPassword,
    governorateId,
    createdBy,
  }) {
    const ownerRole = await roleRepository.findByName(ROLES.BUSINESS_OWNER);
    if (!ownerRole) {
      throw new AppError(ERROR_MESSAGES.ROLE_NOT_FOUND, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    const existingOwner = await userRepository.findByEmail(ownerEmail);
    if (existingOwner) {
      await userRoleRepository.assignRole(existingOwner.id, ownerRole.id);

      const protectedRoles = [ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN, ROLES.SUPPORT_ADMIN];
      const shouldPreservePrimaryRole = protectedRoles.includes(existingOwner.role?.name);

      if (!shouldPreservePrimaryRole && existingOwner.roleId !== ownerRole.id) {
        return userRepository.update(existingOwner.id, {
          roleId: ownerRole.id,
          updatedBy: createdBy,
        });
      }

      return existingOwner;
    }

    if (!ownerPassword) {
      throw new AppError(
        'No login account exists for ownerEmail. Provide password (or ownerPassword) to create the business owner account.',
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    if (await userRepository.phoneExists(ownerPhone)) {
      throw new AppError(ERROR_MESSAGES.PHONE_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    const passId = await governorateRepository.generatePassId(governorateId);
    const password = await hashPassword(ownerPassword);
    const owner = await userRepository.create({
      passId,
      fullName: ownerName,
      email: ownerEmail,
      phoneNumber: ownerPhone,
      password,
      emailVerified: true,
      phoneVerified: false,
      status: USER_STATUS.ACTIVE,
      subscription: SUBSCRIPTION_TIERS.FREE,
      acceptTerms: true,
      governorateId,
      roleId: ownerRole.id,
      createdBy,
    });

    await userRoleRepository.assignRole(owner.id, ownerRole.id);
    return owner;
  }

  async createBusiness(data, userId, ipAddress, userAgent) {
    const ownerPassword = data.ownerPassword || data.password;
    const { ownerPassword: _ownerPassword, password: _password, ...businessData } = data;

    // Check if business email exists
    if (await businessRepository.findByBusinessEmail(businessData.businessEmail)) {
      throw new AppError(ERROR_MESSAGES.BUSINESS_EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    // Check if registration number exists
    if (await businessRepository.findByRegistrationNumber(businessData.registrationNumber)) {
      throw new AppError(ERROR_MESSAGES.REGISTRATION_NUMBER_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    // Check if governorate exists
    const governorate = await governorateRepository.findById(businessData.governorateId);
    if (!governorate) {
      throw new AppError(ERROR_MESSAGES.GOVERNORATE_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
    }

    const owner = await this.resolveOwnerAccount({
      ownerEmail: businessData.ownerEmail,
      ownerName: businessData.ownerName,
      ownerPhone: businessData.ownerPhone,
      ownerPassword,
      governorateId: businessData.governorateId,
      createdBy: userId,
    });

    // Create business
    const business = await businessRepository.create({
      ...businessData,
      ownerId: owner.id,
      createdBy: userId,
    });

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'BUSINESS_CREATED',
      module: 'Businesses',
      ipAddress,
      userAgent,
      payload: { businessId: business.id, businessEmail: business.businessEmail },
    });

    // TODO: Create notification for owner

    return { message: SUCCESS_MESSAGES.BUSINESS_CREATED, business };
  }

  async getBusinesses(query, user) {
    const where = { ...query };

    // If user is Business Owner, only their businesses
    if (user.roles.includes(ROLES.BUSINESS_OWNER)) {
      // We'll handle this in findByOwnerId instead
      return businessRepository.findByOwnerId(user.id, query);
    }

    return businessRepository.findAll(where);
  }

  async getBusinessById(id, user) {
    const business = await businessRepository.findById(id);
    if (!business) {
      throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Check permissions
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    return business;
  }

  async getMyBusinesses(userId, query) {
    return businessRepository.findByOwnerId(userId, query);
  }

  async updateBusiness(id, data, userId, ipAddress, userAgent, user) {
    const business = await businessRepository.findById(id);
    if (!business) {
      throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Check permissions
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && business.ownerId !== userId) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const ownerPassword = data.ownerPassword || data.password;
    const { ownerPassword: _ownerPassword, password: _password, ...businessData } = data;

    // Check for unique constraints if fields are being updated
    if (businessData.businessEmail && businessData.businessEmail !== business.businessEmail) {
      if (await businessRepository.findByBusinessEmail(businessData.businessEmail)) {
        throw new AppError(ERROR_MESSAGES.BUSINESS_EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    if (
      businessData.registrationNumber &&
      businessData.registrationNumber !== business.registrationNumber
    ) {
      if (await businessRepository.findByRegistrationNumber(businessData.registrationNumber)) {
        throw new AppError(ERROR_MESSAGES.REGISTRATION_NUMBER_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    let ownerId = business.ownerId;
    const requestedOwnerEmail = businessData.ownerEmail || business.ownerEmail;
    const ownerNeedsRelinking =
      requestedOwnerEmail !== business.owner?.email || Boolean(ownerPassword);

    if (ownerNeedsRelinking) {
      const owner = await this.resolveOwnerAccount({
        ownerEmail: requestedOwnerEmail,
        ownerName: businessData.ownerName || business.ownerName,
        ownerPhone: businessData.ownerPhone || business.ownerPhone,
        ownerPassword,
        governorateId: businessData.governorateId || business.governorateId,
        createdBy: userId,
      });
      ownerId = owner.id;
    }

    const updatedBusiness = await businessRepository.update(id, {
      ...businessData,
      ownerId,
      updatedBy: userId,
    });

    await auditLogService.create({
      userId,
      action: 'BUSINESS_UPDATED',
      module: 'Businesses',
      ipAddress,
      userAgent,
      payload: { businessId: id },
    });

    return { message: SUCCESS_MESSAGES.BUSINESS_UPDATED, business: updatedBusiness };
  }

  async deleteBusiness(id, userId, ipAddress, userAgent, user) {
    const business = await businessRepository.findById(id);
    if (!business) {
      throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Only Super Admin or Business Owner can delete
    if (!user.roles.includes(ROLES.SUPER_ADMIN) && business.ownerId !== userId) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    await businessRepository.softDelete(id, userId);

    await auditLogService.create({
      userId,
      action: 'BUSINESS_DELETED',
      module: 'Businesses',
      ipAddress,
      userAgent,
      payload: { businessId: id },
    });

    return { message: SUCCESS_MESSAGES.BUSINESS_DELETED };
  }

  async updateBusinessStatus(id, status, userId, ipAddress, userAgent) {
    const business = await businessRepository.findById(id);
    if (!business) {
      throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const updatedBusiness = await businessRepository.update(id, {
      status,
      updatedBy: userId,
    });

    await auditLogService.create({
      userId,
      action: 'BUSINESS_STATUS_UPDATED',
      module: 'Businesses',
      ipAddress,
      userAgent,
      payload: { businessId: id, status },
    });

    return { message: SUCCESS_MESSAGES.BUSINESS_STATUS_UPDATED, business: updatedBusiness };
  }

  async approveBusiness(id, userId, ipAddress, userAgent) {
    const business = await businessRepository.findById(id);
    if (!business) {
      throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const updatedBusiness = await businessRepository.update(id, {
      status: BUSINESS_STATUS.ACTIVE,
      approvalDate: new Date(),
      approvedBy: userId,
      updatedBy: userId,
    });

    await auditLogService.create({
      userId,
      action: 'BUSINESS_APPROVED',
      module: 'Businesses',
      ipAddress,
      userAgent,
      payload: { businessId: id },
    });

    // TODO: Create notification for owner

    return { message: SUCCESS_MESSAGES.BUSINESS_APPROVED, business: updatedBusiness };
  }

  async rejectBusiness(id, userId, ipAddress, userAgent) {
    const business = await businessRepository.findById(id);
    if (!business) {
      throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const updatedBusiness = await businessRepository.update(id, {
      status: BUSINESS_STATUS.REJECTED,
      updatedBy: userId,
    });

    await auditLogService.create({
      userId,
      action: 'BUSINESS_REJECTED',
      module: 'Businesses',
      ipAddress,
      userAgent,
      payload: { businessId: id },
    });

    // TODO: Create notification for owner

    return { message: SUCCESS_MESSAGES.BUSINESS_REJECTED, business: updatedBusiness };
  }

  async getDashboardStats() {
    return businessRepository.getDashboardStats();
  }
}

module.exports = new BusinessService();
