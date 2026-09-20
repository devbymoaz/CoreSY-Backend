const { prisma } = require('../../../prisma');
const { PAGINATION } = require('../../../constants');

const INCLUDE = {
  business: { select: { id: true, name: true, ownerId: true } },
  branch: { select: { id: true, name: true } },
};

class OfferRepository {
  async create(data) {
    return prisma.specialOffer.create({ data, include: INCLUDE });
  }

  async findById(id) {
    return prisma.specialOffer.findFirst({
      where: { id, deletedAt: null },
      include: INCLUDE,
    });
  }

  async findAll(query = {}) {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      businessId,
      branchId,
      status,
      activeOnly,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where = { deletedAt: null };

    if (businessId) where.businessId = businessId;
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    if (activeOnly) {
      const now = new Date();
      where.status = 'ACTIVE';
      where.startDate = { lte: now };
      where.endDate = { gte: now };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [offers, total] = await Promise.all([
      prisma.specialOffer.findMany({
        where,
        include: INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.specialOffer.count({ where }),
    ]);

    return {
      offers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async update(id, data) {
    return prisma.specialOffer.update({
      where: { id },
      data,
      include: INCLUDE,
    });
  }

  async softDelete(id, deletedBy) {
    return prisma.specialOffer.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: deletedBy },
      include: INCLUDE,
    });
  }
}

module.exports = new OfferRepository();
