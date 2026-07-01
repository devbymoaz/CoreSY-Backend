const { prisma } = require('../../../prisma');
const { PAGINATION } = require('../../../constants');

const SLOT_INCLUDE = {
  service: true,
  business: true,
  branch: true,
};

class SlotRepository {
  async create(data) {
    return prisma.slot.create({
      data,
      include: SLOT_INCLUDE,
    });
  }

  async createMany(dataArray) {
    return prisma.slot.createMany({
      data: dataArray,
    });
  }

  async findById(id) {
    return prisma.slot.findUnique({
      where: { id, deletedAt: null },
      include: SLOT_INCLUDE,
    });
  }

  async findAll({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search,
    businessId,
    branchId,
    serviceId,
    status,
    bookingType,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const skip = (page - 1) * limit;
    const where = { deletedAt: null };

    if (businessId) where.businessId = businessId;
    if (branchId) where.branchId = branchId;
    if (serviceId) where.serviceId = serviceId;
    if (status) where.status = status;
    if (bookingType) where.bookingType = bookingType;
    if (startDate || endDate) {
      where.slotDate = {};
      if (startDate) where.slotDate.gte = new Date(startDate);
      if (endDate) where.slotDate.lte = new Date(endDate);
    }

    const [slots, total] = await Promise.all([
      prisma.slot.findMany({
        where,
        include: SLOT_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.slot.count({ where }),
    ]);

    return { slots, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async findByServiceId(serviceId, options = {}) {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
    } = options;
    const skip = (page - 1) * limit;
    const where = { serviceId, deletedAt: null };

    if (status) where.status = status;

    const [slots, total] = await Promise.all([
      prisma.slot.findMany({
        where,
        include: SLOT_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.slot.count({ where }),
    ]);

    return { slots, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async findByBranchId(branchId, options = {}) {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
    } = options;
    const skip = (page - 1) * limit;
    const where = { branchId, deletedAt: null };

    if (status) where.status = status;

    const [slots, total] = await Promise.all([
      prisma.slot.findMany({
        where,
        include: SLOT_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.slot.count({ where }),
    ]);

    return { slots, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async checkForOverlap(branchId, slotDate, startTime, endTime, excludeId = null) {
    const where = {
      branchId,
      slotDate: new Date(slotDate),
      deletedAt: null,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    return prisma.slot.findMany({ where });
  }

  async update(id, data) {
    return prisma.slot.update({
      where: { id },
      data,
      include: SLOT_INCLUDE,
    });
  }

  async softDelete(id, deletedBy) {
    return prisma.slot.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: deletedBy },
      include: SLOT_INCLUDE,
    });
  }

  async getDashboardStats(businessId = null, branchId = null) {
    const baseWhere = { deletedAt: null };
    if (businessId) baseWhere.businessId = businessId;
    if (branchId) baseWhere.branchId = branchId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      total,
      available,
      full,
      bookedCapacity,
      remainingCapacity,
      todaySlots,
      upcomingSlots,
    ] = await Promise.all([
      prisma.slot.count({ where: baseWhere }),
      prisma.slot.count({ where: { ...baseWhere, status: 'AVAILABLE' } }),
      prisma.slot.count({ where: { ...baseWhere, status: 'FULL' } }),
      prisma.slot.aggregate({
        where: baseWhere,
        _sum: { maxCapacity: true },
      }),
      prisma.slot.aggregate({
        where: baseWhere,
        _sum: { remainingCapacity: true },
      }),
      prisma.slot.count({
        where: {
          ...baseWhere,
          slotDate: { gte: today, lt: tomorrow },
        },
      }),
      prisma.slot.count({
        where: {
          ...baseWhere,
          slotDate: { gte: today },
        },
      }),
    ]);

    return {
      totalSlots: total,
      availableSlots: available,
      fullSlots: full,
      totalBookedCapacity: bookedCapacity._sum.maxCapacity || 0,
      totalRemainingCapacity: remainingCapacity._sum.remainingCapacity || 0,
      todaySlots,
      upcomingSlots,
    };
  }
}

module.exports = new SlotRepository();
