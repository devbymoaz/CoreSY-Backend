const branchRepository = require('../repositories/branch.repository');
const businessRepository = require('../../business/repositories/business.repository');
const governorateRepository = require('../../../repositories/governorate.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const AppError = require('../../../utils/AppError');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
  BUSINESS_TYPE,
} = require('../../../constants');

class BranchService {
  async generateBranchCode(businessType) {
    const prefix = this.getBranchCodePrefix(businessType);
    const existingCodes = await branchRepository.findCodesByPrefix(prefix);

    let maxNumber = 0;
    const codePattern = new RegExp(`^${prefix}-(\\d+)$`);
    for (const code of existingCodes) {
      const match = code.match(codePattern);
      if (match) {
        maxNumber = Math.max(maxNumber, parseInt(match[1], 10));
      }
    }

    return `${prefix}-${String(maxNumber + 1).padStart(3, '0')}`;
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

    // If this is main branch, unset other main branches for the same business
    if (data.isMain) {
      const mainBranches = await branchRepository.findByBusinessId(data.businessId);
      for (const existing of mainBranches.branches) {
        if (existing.isMain) {
          await branchRepository.update(existing.id, { isMain: false });
        }
      }
    }

    // Generate unique branch code (retry on rare race collisions)
    let branch;
    let lastError;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = await this.generateBranchCode(business.type);
      try {
        branch = await branchRepository.create({
          ...data,
          code,
          createdBy: userId,
        });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        const target = error.meta?.target;
        const targetText = Array.isArray(target) ? target.join(',') : String(target || '');
        const isCodeConflict = error.code === 'P2002' && targetText.toLowerCase().includes('code');
        if (!isCodeConflict) {
          throw error;
        }
      }
    }

    if (!branch) {
      throw (
        lastError ||
        new AppError(ERROR_MESSAGES.BRANCH_CODE_ALREADY_EXISTS, HTTP_STATUS.CONFLICT)
      );
    }

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

    if (data.isMain === true) {
      const siblings = await branchRepository.findByBusinessId(branch.businessId);
      for (const sibling of siblings.branches) {
        if (sibling.isMain && sibling.id !== id) {
          await branchRepository.update(sibling.id, { isMain: false });
        }
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
