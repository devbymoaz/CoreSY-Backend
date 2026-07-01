const businessRepository = require('../repositories/business.repository');
const governorateRepository = require('../../../../src/repositories/governorate.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const AppError = require('../../../../src/utils/AppError');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
  BUSINESS_STATUS,
} = require('../../../../src/constants');

class BusinessService {
  async createBusiness(data, userId, ipAddress, userAgent) {
    // Check if business email exists
    if (await businessRepository.findByBusinessEmail(data.businessEmail)) {
      throw new AppError(ERROR_MESSAGES.BUSINESS_EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    // Check if registration number exists
    if (await businessRepository.findByRegistrationNumber(data.registrationNumber)) {
      throw new AppError(ERROR_MESSAGES.REGISTRATION_NUMBER_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    // Check if governorate exists
    const governorate = await governorateRepository.findById(data.governorateId);
    if (!governorate) {
      throw new AppError(ERROR_MESSAGES.GOVERNORATE_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
    }

    // Create business
    const business = await businessRepository.create({
      ...data,
      ownerId: userId,
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
    let where = { ...query };

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

    // Check for unique constraints if fields are being updated
    if (data.businessEmail && data.businessEmail !== business.businessEmail) {
      if (await businessRepository.findByBusinessEmail(data.businessEmail)) {
        throw new AppError(ERROR_MESSAGES.BUSINESS_EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    if (data.registrationNumber && data.registrationNumber !== business.registrationNumber) {
      if (await businessRepository.findByRegistrationNumber(data.registrationNumber)) {
        throw new AppError(ERROR_MESSAGES.REGISTRATION_NUMBER_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    const updatedBusiness = await businessRepository.update(id, {
      ...data,
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
