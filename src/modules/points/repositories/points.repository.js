/**
 * Points repository.
 */

const { prisma } = require('../../../prisma');
const { PAGINATION } = require('../../../constants');

class PointsRepository {
  async createAccount(data) {
    return prisma.pointAccount.create({
      data,
      include: { customer: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async findAccountByCustomerId(customerId) {
    return prisma.pointAccount.findUnique({
      where: { customerId },
      include: { customer: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async findAccountById(id) {
    return prisma.pointAccount.findUnique({
      where: { id },
      include: { customer: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async updateAccount(id, data) {
    return prisma.pointAccount.update({
      where: { id },
      data,
      include: { customer: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async findAllAccounts({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search,
    tier,
    sortBy = 'lifetimePoints',
    sortOrder = 'desc',
  } = {}) {
    const skip = (page - 1) * limit;
    const where = {};
    if (tier) where.currentTier = tier;
    if (search) {
      where.OR = [
        { pointWalletId: { contains: search, mode: 'insensitive' } },
        { customer: { fullName: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [accounts, total] = await Promise.all([
      prisma.pointAccount.findMany({
        where,
        include: { customer: { select: { id: true, fullName: true, email: true } } },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.pointAccount.count({ where }),
    ]);

    return {
      accounts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async createTransaction(data) {
    return prisma.pointTransaction.create({ data });
  }

  async findTransactionByReference(referenceNumber) {
    return prisma.pointTransaction.findUnique({ where: { referenceNumber } });
  }

  async findExistingEarn(customerId, { bookingId, orderId, paymentId }) {
    const or = [];
    if (bookingId) or.push({ bookingId, type: 'EARN' });
    if (orderId) or.push({ orderId, type: 'EARN' });
    if (paymentId) or.push({ paymentId, type: 'EARN' });
    if (!or.length) return null;
    return prisma.pointTransaction.findFirst({
      where: { customerId, status: 'COMPLETED', OR: or },
    });
  }

  async findTransactions({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    customerId,
    type,
    status,
    search,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) {
    const skip = (page - 1) * limit;
    const where = {};
    if (customerId) where.customerId = customerId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.pointTransaction.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.pointTransaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async findExpirableTransactions(beforeDate) {
    return prisma.pointTransaction.findMany({
      where: {
        type: 'EARN',
        status: 'COMPLETED',
        expiresAt: { lte: beforeDate },
      },
    });
  }

  async getRules() {
    return prisma.pointRule.findMany({ orderBy: { type: 'asc' } });
  }

  async upsertRule(type, data) {
    return prisma.pointRule.upsert({
      where: { type },
      update: data,
      create: { type, ...data },
    });
  }

  async getAdminDashboard() {
    const [issued, redeemed, expired, topCustomers] = await Promise.all([
      prisma.pointTransaction.aggregate({
        where: {
          type: { in: ['EARN', 'BONUS', 'ADJUSTMENT'] },
          status: 'COMPLETED',
          points: { gt: 0 },
        },
        _sum: { points: true },
      }),
      prisma.pointTransaction.aggregate({
        where: { type: 'REDEEM', status: 'COMPLETED' },
        _sum: { points: true },
      }),
      prisma.pointTransaction.aggregate({
        where: { type: 'EXPIRE', status: 'COMPLETED' },
        _sum: { points: true },
      }),
      prisma.pointAccount.findMany({
        orderBy: { lifetimePoints: 'desc' },
        take: 10,
        include: { customer: { select: { id: true, fullName: true, email: true } } },
      }),
    ]);

    return {
      totalPointsIssued: issued._sum.points || 0,
      redeemed: Math.abs(redeemed._sum.points || 0),
      expired: Math.abs(expired._sum.points || 0),
      topCustomers,
    };
  }
}

module.exports = new PointsRepository();
