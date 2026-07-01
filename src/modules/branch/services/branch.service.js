const branchRepository = require('../repositories/branch.repository');
const businessRepository = require('../../business/repositories/business.repository');
const governorateRepository = require('../../../../src/repositories/governorate.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const AppError = require('../../../../src/utils/AppError');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
  BUSINESS_TYPE,
} = require('../../../../src/constants');

class BranchService {
  async generateBranchCode(businessType) {
    const prefix = this.getBranchCodePrefix(businessType);

    // Find the latest branch count for this prefix
    const latestBranch = await branchRepository.findAll({
      page: 1,
      limit: 1,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    let nextNumber = 1;
    if (latestBranch.branches.length > 0) {
      const latestCode = latestBranch.branches[0].code;
      const match = latestCode.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
  }

  getBranchCodePrefix(businessType) {
    const typeMap = {
      [BUSINESS_TYPE.RESTAURANT]: 'REST',
      [BUSINESS_TYPE.CAFE]: 'CAFE',
      [BUSINESS_TYPE.BAR]: 'BAR',
      [BUSINESS_TYPE.MEDICAL_CLINIC]: 'CLINIC',
      [BUSINESS_TYPE.HOSPITAL]: 'HOSP',
      [BUSINESS_TYPE.DENTAL_CLINIC]: 'DENTAL',
      [BUSINESS_TYPE.PHARMACY]: 'PHARM',
      [BUSINESS_TYPE.BEAUTY_SALON]: 'SALON',
      [BUSINESS_TYPE.SPA]: 'SPA',
      [BUSINESS_TYPE.GYM]: 'GYM',
      [BUSINESS_TYPE.SPORTS_CLUB]: 'SPORT',
      [BUSINESS_TYPE.ENTERTAINMENT_CENTER]: 'ENT',
      [BUSINESS_TYPE.JUICE_SHOP]: 'JUICE',
      [BUSINESS_TYPE.SWEET_SHOP]: 'SWEET',
      [BUSINESS_TYPE.SUPERMARKET]: 'SUPER',
      [BUSINESS_TYPE.RETAIL_STORE]: 'RETAIL',
      [BUSINESS_TYPE.OTHER]: 'BRANCH',
    };

    return typeMap[businessType] || 'BRANCH';
  }

  async createBranch(data, userId, ipAddress, userAgent, user) {
    // Check if business exists
    const business = await businessRepository.findById(data.businessId);
    if (!business) {
      throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Check if user has access to the business
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && business.ownerId !== userId) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    // Check if governorate exists
    const governorate = await governorateRepository.findById(data.governorateId);
    if (!governorate) {
      throw new AppError(ERROR_MESSAGES.GOVERNORATE_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
    }

    // Check if branch name is unique for the business
    const existingBranch = await branchRepository.findByBusinessIdAndName(
      data.businessId,
      data.name,
    );
    if (existingBranch) {
      throw new AppError(ERROR_MESSAGES.BRANCH_NAME_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    // Generate branch code
    const code = await this.generateBranchCode(business.type);

    // If this is main branch, unset other main branches for the same business
    if (data.isMain) {
      const mainBranches = await branchRepository.findByBusinessId(data.businessId);
      for (const branch of mainBranches.branches) {
        if (branch.isMain) {
          await branchRepository.update(branch.id, { isMain: false });
        }
      }
    }

    // Create branch
    const branch = await branchRepository.create({
      ...data,
      code,
      createdBy: userId,
    });

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'BRANCH_CREATED',
      module: 'Branches',
      ipAddress,
      userAgent,
      payload: { branchId: branch.id, branchName: branch.name },
    });

    return { message: SUCCESS_MESSAGES.BRANCH_CREATED, branch };
  }

  async getBranches(query, user) {
    const where = { ...query };

    // If user is business owner, only their business branches
    if (user.roles.includes(ROLES.BUSINESS_OWNER)) {
      // Get all businesses owned by user and filter branches
    }

    return branchRepository.findAll(where);
  }

  async getBranchById(id, user) {
    const branch = await branchRepository.findById(id);
    if (!branch) {
      throw new AppError(ERROR_MESSAGES.BRANCH_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Check permissions
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && branch.business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    return branch;
  }

  async getBusinessBranches(businessId, user, options) {
    const business = await businessRepository.findById(businessId);
    if (!business) {
      throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Check permissions
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    return branchRepository.findByBusinessId(businessId, options);
  }

  async updateBranch(id, data, userId, ipAddress, userAgent, user) {
    const branch = await branchRepository.findById(id);
    if (!branch) {
      throw new AppError(ERROR_MESSAGES.BRANCH_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Check permissions
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && branch.business.ownerId !== userId) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    // Check branch name uniqueness if name is being updated
    if (data.name && data.name !== branch.name) {
      const existingBranch = await branchRepository.findByBusinessIdAndName(
        branch.businessId,
        data.name,
        id,
      );
      if (existingBranch) {
        throw new AppError(ERROR_MESSAGES.BRANCH_NAME_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    // Update branch
    const updatedBranch = await branchRepository.update(id, {
      ...data,
      updatedBy: userId,
    });

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'BRANCH_UPDATED',
      module: 'Branches',
      ipAddress,
      userAgent,
      payload: { branchId: id },
    });

    return { message: SUCCESS_MESSAGES.BRANCH_UPDATED, branch: updatedBranch };
  }

  async deleteBranch(id, userId, ipAddress, userAgent, user) {
    const branch = await branchRepository.findById(id);
    if (!branch) {
      throw new AppError(ERROR_MESSAGES.BRANCH_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Check permissions
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && branch.business.ownerId !== userId) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    // Soft delete branch
    await branchRepository.softDelete(id, userId);

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'BRANCH_DELETED',
      module: 'Branches',
      ipAddress,
      userAgent,
      payload: { branchId: id },
    });

    return { message: SUCCESS_MESSAGES.BRANCH_DELETED };
  }

  async updateBranchStatus(id, status, userId, ipAddress, userAgent) {
    const branch = await branchRepository.findById(id);
    if (!branch) {
      throw new AppError(ERROR_MESSAGES.BRANCH_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Update status
    const updatedBranch = await branchRepository.update(id, {
      status,
      updatedBy: userId,
    });

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'BRANCH_STATUS_UPDATED',
      module: 'Branches',
      ipAddress,
      userAgent,
      payload: { branchId: id, status },
    });

    return { message: SUCCESS_MESSAGES.BRANCH_STATUS_UPDATED, branch: updatedBranch };
  }

  async setMainBranch(id, userId, ipAddress, userAgent, user) {
    const branch = await branchRepository.findById(id);
    if (!branch) {
      throw new AppError(ERROR_MESSAGES.BRANCH_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Check permissions
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && branch.business.ownerId !== userId) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    // Unset other main branches for the same business
    const mainBranches = await branchRepository.findByBusinessId(branch.businessId);
    for (const b of mainBranches.branches) {
      if (b.isMain && b.id !== id) {
        await branchRepository.update(b.id, { isMain: false });
      }
    }

    // Set this branch as main
    const updatedBranch = await branchRepository.update(id, {
      isMain: true,
      updatedBy: userId,
    });

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'BRANCH_MAIN_UPDATED',
      module: 'Branches',
      ipAddress,
      userAgent,
      payload: { branchId: id },
    });

    return { message: SUCCESS_MESSAGES.BRANCH_MAIN_UPDATED, branch: updatedBranch };
  }

  async getDashboardStats() {
    return branchRepository.getDashboardStats();
  }
}

module.exports = new BranchService();
