const { prisma } = require('../../../prisma');
const { PAGINATION } = require('../../../constants');

const CASHIER_INCLUDE = {
  business: true,
  branch: true,
};

class CashierRepository {
  async create(data) {
    return prisma.cashier.create({
      data,
      include: CASHIER_INCLUDE,
    });
  }

  async findById(id) {
    return prisma.cashier.findUnique({
      where: { id, deletedAt: null },
      include: CASHIER_INCLUDE,
    });
  }

  async findByEmployeeId(employeeId) {
    return prisma.cashier.findUnique({
      where: { employeeId, deletedAt: null },
      include: CASHIER_INCLUDE,
    });
  }

  async findByEmail(email) {
    return prisma.cashier.findUnique({
      where: { email, deletedAt: null },
      include: CASHIER_INCLUDE,
    });
  }

  async findByPhoneNumber(phoneNumber) {
    return prisma.cashier.findUnique({
      where: { phoneNumber, deletedAt: null },
      include: CASHIER_INCLUDE,
    });
  }

  async findAll({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search,
    businessId,
    branchId,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const skip = (page - 1) * limit;
    const where = { deletedAt: null };

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (businessId) {
      where.businessId = businessId;
    }

    if (branchId) {
      where.branchId = branchId;
    }

    if (status) {
      where.status = status;
    }

    const [cashiers, total] = await Promise.all([
      prisma.cashier.findMany({
        where,
        include: CASHIER_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.cashier.count({ where }),
    ]);

    return { cashiers, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async findByBusinessId(businessId, options = {}) {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;
    const skip = (page - 1) * limit;
    const where = { businessId, deletedAt: null };

    const [cashiers, total] = await Promise.all([
      prisma.cashier.findMany({
        where,
        include: CASHIER_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.cashier.count({ where }),
    ]);

    return { cashiers, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async findByBranchId(branchId, options = {}) {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;
    const skip = (page - 1) * limit;
    const where = { branchId, deletedAt: null };

    const [cashiers, total] = await Promise.all([
      prisma.cashier.findMany({
        where,
        include: CASHIER_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.cashier.count({ where }),
    ]);

    return { cashiers, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async update(id, data) {
    return prisma.cashier.update({
      where: { id },
      data,
      include: CASHIER_INCLUDE,
    });
  }

  async softDelete(id, deletedBy) {
    return prisma.cashier.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: deletedBy },
      include: CASHIER_INCLUDE,
    });
  }

  async getDashboardStats() {
    const where = { deletedAt: null };

    const [total, active, inactive, suspended, byBusiness, byBranch] = await Promise.all([
      prisma.cashier.count({ where }),
      prisma.cashier.count({ where: { ...where, status: 'ACTIVE' } }),
      prisma.cashier.count({ where: { ...where, status: 'INACTIVE' } }),
      prisma.cashier.count({ where: { ...where, status: 'SUSPENDED' } }),
      prisma.cashier.groupBy({ by: ['businessId'], where, _count: true }),
      prisma.cashier.groupBy({ by: ['branchId'], where, _count: true }),
    ]);

    return {
      totalCashiers: total,
      activeCashiers: active,
      inactiveCashiers: inactive,
      suspendedCashiers: suspended,
      cashiersByBusiness: byBusiness.map((item) => ({
        businessId: item.businessId,
        count: item._count,
      })),
      cashiersByBranch: byBranch.map((item) => ({
        branchId: item.branchId,
        count: item._count,
      })),
    };
  }
}

module.exports = new CashierRepository();
