const { prisma } = require('../../../../prisma');
const { PAGINATION, ROLES } = require('../../../../constants');

const BUSINESS_INCLUDE = {
  governorate: true,
  owner: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
    },
  },
};

class BusinessRepository {
  async create(data) {
    return prisma.business.create({
      data,
      include: BUSINESS_INCLUDE,
    });
  }

  async findById(id) {
    return prisma.business.findUnique({
      where: {
        id,
        deletedAt: null,
      },
      include: BUSINESS_INCLUDE,
    });
  }

  async findByBusinessEmail(businessEmail) {
    return prisma.business.findUnique({
      where: {
        businessEmail,
        deletedAt: null,
      },
      include: BUSINESS_INCLUDE,
    });
  }

  async findByRegistrationNumber(registrationNumber) {
    return prisma.business.findUnique({
      where: {
        registrationNumber,
        deletedAt: null,
      },
      include: BUSINESS_INCLUDE,
    });
  }

  async findAll({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search,
    type,
    status,
    governorateId,
    category,
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
        { ownerName: { contains: search, mode: 'insensitive' } },
        { businessEmail: { contains: search, mode: 'insensitive' } },
        { businessPhone: { contains: search } },
        { ownerPhone: { contains: search } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (governorateId) {
      where.governorateId = governorateId;
    }

    if (category) {
      where.category = category;
    }

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        include: BUSINESS_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.business.count({ where }),
    ]);

    return {
      businesses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findByOwnerId(
    ownerId,
    {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    },
  ) {
    const skip = (page - 1) * limit;
    const where = {
      ownerId,
      deletedAt: null,
    };

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        include: BUSINESS_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.business.count({ where }),
    ]);

    return {
      businesses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async update(id, data) {
    return prisma.business.update({
      where: { id },
      data,
      include: BUSINESS_INCLUDE,
    });
  }

  async softDelete(id, deletedBy) {
    return prisma.business.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: deletedBy,
      },
      include: BUSINESS_INCLUDE,
    });
  }

  async getDashboardStats() {
    const where = {
      deletedAt: null,
    };

    const total = await prisma.business.count({ where });
    const pending = await prisma.business.count({ where: { ...where, status: 'PENDING' } });
    const approved = await prisma.business.count({ where: { ...where, status: 'APPROVED' } });
    const rejected = await prisma.business.count({ where: { ...where, status: 'REJECTED' } });
    const suspended = await prisma.business.count({ where: { ...where, status: 'SUSPENDED' } });

    const byCategory = await prisma.business.groupBy({
      by: ['category'],
      where,
      _count: true,
    });

    const byGovernorate = await prisma.business.groupBy({
      by: ['governorateId'],
      where,
      _count: true,
    });

    return {
      totalBusinesses: total,
      pendingBusinesses: pending,
      approvedBusinesses: approved,
      rejectedBusinesses: rejected,
      suspendedBusinesses: suspended,
      businessesByCategory: byCategory.map((item) => ({
        category: item.category,
        count: item._count,
      })),
      businessesByGovernorate: byGovernorate.map((item) => ({
        governorateId: item.governorateId,
        count: item._count,
      })),
    };
  }
}

module.exports = new BusinessRepository();
