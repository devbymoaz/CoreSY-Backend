const serviceRepository = require('../repositories/service.repository');
const businessRepository = require('../../business/repositories/business.repository');
const branchRepository = require('../../branch/repositories/branch.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const { removePublicUpload } = require('../../../middlewares/upload.middleware');
const AppError = require('../../../utils/AppError');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
  PERMISSION_MODULES,
} = require('../../../constants');

class ServiceService {
  async generateServiceCode(branchId) {
    const branch = await branchRepository.findById(branchId);
    const prefix = (branch?.code || 'SRV').replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() || 'SRV';
    const stamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 900) + 100;
    return `${prefix}-${stamp}${random}`;
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

    if (branch.businessId !== data.businessId) {
      throw new AppError(
        'branchId does not belong to the given businessId.',
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    // Check permissions
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    // Name may repeat on a branch; uniqueness is enforced by service code only.
    // Create with retry if generated code collides with a soft-deleted row.
    let service;
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const code = await this.generateServiceCode(data.branchId);
      try {
        service = await serviceRepository.create({
          ...data,
          name: data.name.trim(),
          code,
          createdBy: userId,
        });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        const target = error?.meta?.target;
        const targetText = Array.isArray(target) ? target.join(',') : String(target || '');
        if (error?.code === 'P2002' && targetText.toLowerCase().includes('code')) {
          continue;
        }
        throw error;
      }
    }
    if (!service) {
      throw lastError || new AppError(ERROR_MESSAGES.SERVICE_CODE_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

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

  async getServices(query, _user) {
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

    const updatedService = await serviceRepository.update(id, {
      ...data,
      ...(data.name ? { name: data.name.trim() } : {}),
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
    await Promise.all([
      removePublicUpload(service.serviceImage),
      ...(service.galleryImages || []).map((image) => removePublicUpload(image)),
    ]);

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

  async uploadServiceImage(id, imageUrl, userId, ipAddress, userAgent, user) {
    const service = await serviceRepository.findById(id);
    if (!service) {
      throw new AppError(ERROR_MESSAGES.SERVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    if (!user.roles.includes(ROLES.SUPER_ADMIN) && service.business.ownerId !== userId) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const updatedService = await serviceRepository.update(id, {
      serviceImage: imageUrl,
      updatedBy: userId,
    });
    await removePublicUpload(service.serviceImage);

    await auditLogService.create({
      userId,
      action: 'SERVICE_IMAGE_UPLOADED',
      module: PERMISSION_MODULES.SERVICES,
      ipAddress,
      userAgent,
      payload: { serviceId: id, serviceImage: imageUrl },
    });

    return { message: SUCCESS_MESSAGES.SERVICE_IMAGE_UPLOADED, service: updatedService };
  }

  async uploadServiceGallery(id, imageUrls, userId, ipAddress, userAgent, user) {
    const service = await serviceRepository.findById(id);
    if (!service) {
      throw new AppError(ERROR_MESSAGES.SERVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    if (!user.roles.includes(ROLES.SUPER_ADMIN) && service.business.ownerId !== userId) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const galleryImages = [...new Set([...(service.galleryImages || []), ...imageUrls])].slice(
      0,
      20,
    );
    const updatedService = await serviceRepository.update(id, {
      galleryImages,
      updatedBy: userId,
    });

    await auditLogService.create({
      userId,
      action: 'SERVICE_GALLERY_UPLOADED',
      module: PERMISSION_MODULES.SERVICES,
      ipAddress,
      userAgent,
      payload: { serviceId: id, imagesAdded: imageUrls.length },
    });

    return { message: SUCCESS_MESSAGES.SERVICE_GALLERY_UPLOADED, service: updatedService };
  }
}

module.exports = new ServiceService();
