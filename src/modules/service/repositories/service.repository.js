const { prisma } = require('../../../prisma');
const { PAGINATION } = require('../../../constants');

const SERVICE_INCLUDE = {
  business: true,
  branch: true,
};

class ServiceRepository {
  async create(data) {
    return prisma.service.create({
      data,
      include: SERVICE_INCLUDE,
    });
  }

  async findById(id) {
    return prisma.service.findUnique({
      where: {
        id,
        deletedAt: null,
      },
      include: SERVICE_INCLUDE,
    });
  }

  async findByCode(code) {
    return prisma.service.findUnique({
      where: {
        code,
        deletedAt: null,
      },
      include: SERVICE_INCLUDE,
    });
  }

  async findByNameAndBranchId(name, branchId, excludeId = null) {
    const where = {
      name,
      branchId,
      deletedAt: null,
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    return prisma.service.findFirst({
      where,
      include: SERVICE_INCLUDE,
    });
  }

  async findAll({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search,
    businessId,
    branchId,
    category,
    type,
    status,
    isFeatured,
    minPrice,
    maxPrice,
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
        { business: { name: { contains: search, mode: 'insensitive' } } },
        { branch: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (businessId) {
      where.businessId = businessId;
    }

    if (branchId) {
      where.branchId = branchId;
    }

    if (category) {
      where.category = category;
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (typeof isFeatured === 'boolean') {
      where.isFeatured = isFeatured;
    }

    if (minPrice !== undefined) {
      where.price = { ...where.price, gte: minPrice };
    }

    if (maxPrice !== undefined) {
      where.price = { ...where.price, lte: maxPrice };
    }

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: SERVICE_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.service.count({ where }),
    ]);

    return {
      services,
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

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: SERVICE_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.service.count({ where }),
    ]);

    return {
      services,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findByBranchId(branchId, options = {}) {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;
    const where = {
      branchId,
      deletedAt: null,
    };

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: SERVICE_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.service.count({ where }),
    ]);

    return {
      services,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async update(id, data) {
    return prisma.service.update({
      where: { id },
      data,
      include: SERVICE_INCLUDE,
    });
  }

  async softDelete(id, deletedBy) {
    return prisma.service.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: deletedBy,
      },
      include: SERVICE_INCLUDE,
    });
  }

  async getDashboardStats() {
    const where = {
      deletedAt: null,
    };

    const [
      total,
      active,
      inactive,
      featured,
      byCategory,
      byBranch,
    ] = await Promise.all([
      prisma.service.count({ where }),
      prisma.service.count({ where: { ...where, status: 'ACTIVE' } }),
      prisma.service.count({ where: { ...where, status: 'INACTIVE' } }),
      prisma.service.count({ where: { ...where, isFeatured: true } }),
      prisma.service.groupBy({
        by: ['category'],
        where,
        _count: true,
      }),
      prisma.service.groupBy({
        by: ['branchId'],
        where,
        _count: true,
      }),
    ]);

    return {
      totalServices: total,
      activeServices: active,
      inactiveServices: inactive,
      featuredServices: featured,
      servicesByCategory: byCategory.map((item) => ({
        category: item.category,
        count: item._count,
      })),
      servicesByBranch: byBranch.map((item) => ({
        branchId: item.branchId,
        count: item._count,
      })),
    };
  }
}

module.exports = new ServiceRepository();
