const { prisma } = require('../../../prisma');
const { PAGINATION } = require('../../../constants');

const INCLUDE = {
  business: { select: { id: true, name: true, ownerId: true } },
  branch: { select: { id: true, name: true } },
};

class RewardRepository {
  async create(data) {
    return prisma.reward.create({ data, include: INCLUDE });
  }

  async findById(id) {
    return prisma.reward.findFirst({
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
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where = { deletedAt: null };
    if (businessId) where.businessId = businessId;
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rewards, total] = await Promise.all([
      prisma.reward.findMany({
        where,
        include: INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.reward.count({ where }),
    ]);

    return {
      rewards,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async update(id, data) {
    return prisma.reward.update({ where: { id }, data, include: INCLUDE });
  }

  async softDelete(id, deletedBy) {
    return prisma.reward.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: deletedBy },
      include: INCLUDE,
    });
  }

  async createRedemption(data) {
    return prisma.rewardRedemption.create({
      data,
      include: {
        reward: true,
        user: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async decrementStock(id) {
    return prisma.reward.update({
      where: { id },
      data: { stock: { decrement: 1 } },
    });
  }
}

module.exports = new RewardRepository();
