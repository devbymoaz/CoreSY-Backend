const serviceRepository = require('../repositories/service.repository');
const businessRepository = require('../../business/repositories/business.repository');
const branchRepository = require('../../branch/repositories/branch.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const AppError = require('../../../utils/AppError');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
  SERVICE_STATUS,
  PERMISSION_MODULES,
} = require('../../../constants');

class ServiceService {
  async generateServiceCode(branchId) {
    const latestService = await serviceRepository.findAll({
      page: 1,
      limit: 1,
      branchId,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    let nextNumber = 1;
    if (latestService.services.length > 0) {
      const latestCode = latestService.services[0].code;
      const match = latestCode.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const branch = await branchRepository.findById(branchId);
    const prefix = branch?.code?.substring(0, 3) || 'SRV';
    return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
  }

  async createService(data, userId, ipAddress, userAgent, user) {
    // Check if business exists
    const business = await businessRepository.findById(data.businessId);
    if (!business) {
      throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Check if branch exists
    const branch = await branchRepository.findById(data.branchId);
    if (!branch) {
      throw new AppError(ERROR_MESSAGES.BRANCH_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Check permissions
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    // Check if service name already exists for this branch
    const existingService = await serviceRepository.findByNameAndBranchId(data.name, data.branchId);
    if (existingService) {
      throw new AppError(ERROR_MESSAGES.SERVICE_NAME_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    // Generate service code
    const code = await this.generateServiceCode(data.branchId);

    // Create service
    const service = await serviceRepository.create({
      ...data,
      code,
      createdBy: userId,
    });

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'SERVICE_CREATED',
      module: PERMISSION_MODULES.SERVICES,
      ipAddress,
      userAgent,
      payload: { serviceId: service.id, serviceCode: service.code },
    });

    return { message: SUCCESS_MESSAGES.SERVICE_CREATED, service };
  }

  async getServices(query, user) {
    const where = { ...query };
    return serviceRepository.findAll(where);
  }

  async getServiceById(id, user) {
    const service = await serviceRepository.findById(id);
    if (!service) {
      throw new AppError(ERROR_MESSAGES.SERVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Check permissions
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && service.business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    return service;
  }

  async getBusinessServices(businessId, user, options = {}) {
    const business = await businessRepository.findById(businessId);
    if (!business) {
      throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Check permissions
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    return serviceRepository.findByBusinessId(businessId, options);
  }

  async getBranchServices(branchId, user, options = {}) {
    const branch = await branchRepository.findById(branchId);
    if (!branch) {
      throw new AppError(ERROR_MESSAGES.BRANCH_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Check permissions
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && branch.business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    return serviceRepository.findByBranchId(branchId, options);
  }

  async updateService(id, data, userId, ipAddress, userAgent, user) {
    const service = await serviceRepository.findById(id);
    if (!service) {
      throw new AppError(ERROR_MESSAGES.SERVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Check permissions
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && service.business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    // Check unique name if name is being updated
    if (data.name) {
      const existingService = await serviceRepository.findByNameAndBranchId(
        data.name,
        service.branchId,
        id,
      );
      if (existingService) {
        throw new AppError(ERROR_MESSAGES.SERVICE_NAME_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    const updatedService = await serviceRepository.update(id, {
      ...data,
      updatedBy: userId,
    });

    await auditLogService.create({
      userId,
      action: 'SERVICE_UPDATED',
      module: PERMISSION_MODULES.SERVICES,
      ipAddress,
      userAgent,
      payload: { serviceId: id },
    });

    return { message: SUCCESS_MESSAGES.SERVICE_UPDATED, service: updatedService };
  }

  async deleteService(id, userId, ipAddress, userAgent, user) {
    const service = await serviceRepository.findById(id);
    if (!service) {
      throw new AppError(ERROR_MESSAGES.SERVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Check permissions
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && service.business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    await serviceRepository.softDelete(id, userId);

    await auditLogService.create({
      userId,
      action: 'SERVICE_DELETED',
      module: PERMISSION_MODULES.SERVICES,
      ipAddress,
      userAgent,
      payload: { serviceId: id },
    });

    return { message: SUCCESS_MESSAGES.SERVICE_DELETED };
  }

  async updateServiceStatus(id, status, userId, ipAddress, userAgent) {
    const service = await serviceRepository.findById(id);
    if (!service) {
      throw new AppError(ERROR_MESSAGES.SERVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const updatedService = await serviceRepository.update(id, {
      status,
      updatedBy: userId,
    });

    await auditLogService.create({
      userId,
      action: 'SERVICE_STATUS_UPDATED',
      module: PERMISSION_MODULES.SERVICES,
      ipAddress,
      userAgent,
      payload: { serviceId: id, status },
    });

    return {
      message: SUCCESS_MESSAGES.SERVICE_STATUS_UPDATED,
      service: updatedService,
    };
  }

  async updateServiceFeatured(id, isFeatured, userId, ipAddress, userAgent) {
    const service = await serviceRepository.findById(id);
    if (!service) {
      throw new AppError(ERROR_MESSAGES.SERVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const updatedService = await serviceRepository.update(id, {
      isFeatured,
      updatedBy: userId,
    });

    await auditLogService.create({
      userId,
      action: 'SERVICE_FEATURED_UPDATED',
      module: PERMISSION_MODULES.SERVICES,
      ipAddress,
      userAgent,
      payload: { serviceId: id, isFeatured },
    });

    return {
      message: SUCCESS_MESSAGES.SERVICE_FEATURED_UPDATED,
      service: updatedService,
    };
  }

  async getDashboardStats() {
    return serviceRepository.getDashboardStats();
  }
}

module.exports = new ServiceService();
