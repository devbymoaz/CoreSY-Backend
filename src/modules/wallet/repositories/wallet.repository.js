/**
 * Wallet repository.
 * Data access for wallets and wallet ledger transactions.
 */

const { prisma } = require('../../../prisma');
const { PAGINATION } = require('../../../constants');

const WALLET_INCLUDE = {
  customer: {
    select: { id: true, fullName: true, email: true, phoneNumber: true },
  },
};

class WalletRepository {
  async create(data) {
    return prisma.wallet.create({ data, include: WALLET_INCLUDE });
  }

  async findById(id) {
    return prisma.wallet.findFirst({
      where: { id, deletedAt: null },
      include: WALLET_INCLUDE,
    });
  }

  async findByWalletId(walletId) {
    return prisma.wallet.findFirst({
      where: { walletId, deletedAt: null },
      include: WALLET_INCLUDE,
    });
  }

  async findByCustomerId(customerId) {
    return prisma.wallet.findFirst({
      where: { customerId, deletedAt: null },
      include: WALLET_INCLUDE,
    });
  }

  async findAll({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) {
    const skip = (page - 1) * limit;
    const where = { deletedAt: null };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { walletId: { contains: search, mode: 'insensitive' } },
        { customer: { fullName: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
        { customer: { phoneNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [wallets, total] = await Promise.all([
      prisma.wallet.findMany({
        where,
        include: WALLET_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.wallet.count({ where }),
    ]);

    return {
      wallets,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async update(id, data) {
    return prisma.wallet.update({
      where: { id },
      data,
      include: WALLET_INCLUDE,
    });
  }

  async createTransaction(data) {
    return prisma.walletTransaction.create({ data });
  }

  async findTransactions({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    walletId,
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
    if (walletId) where.walletId = walletId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { transactionId: { contains: search, mode: 'insensitive' } },
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
      prisma.walletTransaction.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.walletTransaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async getAdminDashboard() {
    const where = { deletedAt: null };
    const [totalWallets, activeWallets, balances, credits, debits] = await Promise.all([
      prisma.wallet.count({ where }),
      prisma.wallet.count({ where: { ...where, status: 'ACTIVE' } }),
      prisma.wallet.aggregate({
        where,
        _sum: { currentBalance: true, availableBalance: true, blockedBalance: true },
      }),
      prisma.walletTransaction.aggregate({
        where: {
          status: 'COMPLETED',
          type: {
            in: [
              'CREDIT',
              'REFUND',
              'TOP_UP',
              'CASHBACK',
              'REWARD_CREDIT',
              'ADMIN_ADJUSTMENT',
              'PLATFORM_REFUND',
            ],
          },
          amount: { gt: 0 },
        },
        _sum: { amount: true },
      }),
      prisma.walletTransaction.aggregate({
        where: {
          status: 'COMPLETED',
          type: { in: ['DEBIT', 'REWARD_REDEMPTION'] },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalWallets,
      activeWallets,
      totalBalance: Number(balances._sum.currentBalance || 0),
      availableBalance: Number(balances._sum.availableBalance || 0),
      blockedBalance: Number(balances._sum.blockedBalance || 0),
      totalCredits: Number(credits._sum.amount || 0),
      totalDebits: Number(debits._sum.amount || 0),
    };
  }

  async getCustomerDashboard(walletId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [wallet, todayCount, monthlyDebits, refunds] = await Promise.all([
      this.findById(walletId),
      prisma.walletTransaction.count({
        where: { walletId, createdAt: { gte: startOfDay } },
      }),
      prisma.walletTransaction.aggregate({
        where: {
          walletId,
          type: { in: ['DEBIT', 'REWARD_REDEMPTION'] },
          status: 'COMPLETED',
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      prisma.walletTransaction.aggregate({
        where: {
          walletId,
          type: { in: ['REFUND', 'PLATFORM_REFUND'] },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      walletBalance: Number(wallet?.availableBalance || 0),
      todaysTransactions: todayCount,
      monthlySpending: Number(monthlyDebits._sum.amount || 0),
      refunds: Number(refunds._sum.amount || 0),
    };
  }
}

module.exports = new WalletRepository();
