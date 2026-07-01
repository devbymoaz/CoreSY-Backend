const { prisma } = require('../../../../prisma');
const { PAGINATION } = require('../../../../src/constants');

const BRANCH_INCLUDE = {
  business: true,
  governorate: true,
};

class BranchRepository {
  async create(data) {
    return prisma.branch.create({
      data,
      include: BRANCH_INCLUDE,
    });
  }

  async findById(id) {
    return prisma.branch.findUnique({
      where: {
        id,
        deletedAt: null,
      },
      include: BRANCH_INCLUDE,
    });
  }

  async findByCode(code) {
    return prisma.branch.findUnique({
      where: {
        code,
        deletedAt: null,
      },
      include: BRANCH_INCLUDE,
    });
  }

  async findByBusinessIdAndName(businessId, name, excludeId = null) {
    const where = {
      businessId,
      name,
      deletedAt: null,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    return prisma.branch.findFirst({
      where,
      include: BRANCH_INCLUDE,
    });
  }

  async findAll({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search,
    businessId,
    status,
    governorateId,
    city,
    isMain,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const skip = (page - 1) * limit;
    const where = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { business: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (businessId) {
      where.businessId = businessId;
    }

    if (status) {
      where.status = status;
    }

    if (governorateId) {
      where.governorateId = governorateId;
    }

    if (city) {
      where.city = city;
    }

    if (typeof isMain === 'boolean') {
      where.isMain = isMain;
    }

    const [branches, total] = await Promise.all([
      prisma.branch.findMany({
        where,
        include: BRANCH_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.branch.count({ where }),
    ]);

    return {
      branches,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findByBusinessId(businessId, options = {}) {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;
    const where = {
      businessId,
      deletedAt: null,
    };

    const [branches, total] = await Promise.all([
      prisma.branch.findMany({
        where,
        include: BRANCH_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.branch.count({ where }),
    ]);

    return {
      branches,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async update(id, data) {
    return prisma.branch.update({
      where: { id },
      data,
      include: BRANCH_INCLUDE,
    });
  }

  async softDelete(id, deletedBy) {
    return prisma.branch.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: deletedBy,
      },
      include: BRANCH_INCLUDE,
    });
  }

  async getDashboardStats() {
    const where = {
      deletedAt: null,
    };

    const [total, active, inactive, suspended] = await Promise.all([
      prisma.branch.count({ where }),
      prisma.branch.count({ where: { ...where, status: 'ACTIVE' } }),
      prisma.branch.count({ where: { ...where, status: 'INACTIVE' } }),
      prisma.branch.count({ where: { ...where, status: 'SUSPENDED' } }),
    ]);

    return {
      total,
      active,
      inactive,
      suspended,
    };
  }
}

module.exports = new BranchRepository();
