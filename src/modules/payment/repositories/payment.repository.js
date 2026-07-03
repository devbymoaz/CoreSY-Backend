/**
 * Payment repository.
 * Data access for payment records and transactions.
 */

const { prisma } = require('../../../prisma');
const { PAGINATION, PAYMENT_RECORD_STATUS } = require('../../../constants');

const PAYMENT_INCLUDE = {
  customer: {
    select: { id: true, fullName: true, email: true, phoneNumber: true },
  },
  business: { select: { id: true, name: true, ownerId: true } },
  branch: { select: { id: true, name: true, code: true } },
  booking: { select: { id: true, bookingNumber: true, paymentStatus: true } },
  order: { select: { id: true, orderNumber: true, paymentStatus: true, grandTotal: true } },
};

class PaymentRepository {
  async create(data) {
    return prisma.payment.create({ data, include: PAYMENT_INCLUDE });
  }

  async findById(id) {
    return prisma.payment.findFirst({
      where: { id, deletedAt: null },
      include: PAYMENT_INCLUDE,
    });
  }

  async findByPaymentId(paymentId) {
    return prisma.payment.findFirst({
      where: { paymentId, deletedAt: null },
      include: PAYMENT_INCLUDE,
    });
  }

  async findSuccessfulByBookingId(bookingId) {
    return prisma.payment.findFirst({
      where: {
        bookingId,
        deletedAt: null,
        status: {
          in: [
            PAYMENT_RECORD_STATUS.SUCCESSFUL,
            PAYMENT_RECORD_STATUS.PARTIALLY_REFUNDED,
            PAYMENT_RECORD_STATUS.PROCESSING,
            PAYMENT_RECORD_STATUS.PENDING,
          ],
        },
      },
    });
  }

  async findSuccessfulByOrderId(orderId) {
    return prisma.payment.findFirst({
      where: {
        orderId,
        deletedAt: null,
        status: {
          in: [
            PAYMENT_RECORD_STATUS.SUCCESSFUL,
            PAYMENT_RECORD_STATUS.PARTIALLY_REFUNDED,
            PAYMENT_RECORD_STATUS.PROCESSING,
            PAYMENT_RECORD_STATUS.PENDING,
          ],
        },
      },
    });
  }

  async findAll({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search,
    customerId,
    businessId,
    businessIds,
    status,
    paymentMethod,
    minAmount,
    maxAmount,
    startDate,
    endDate,
    todayOnly = false,
    historyOnly = false,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) {
    const skip = (page - 1) * limit;
    const where = { deletedAt: null };

    if (customerId) where.customerId = customerId;
    if (businessId) where.businessId = businessId;
    if (businessIds) where.businessId = { in: businessIds };
    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    if (historyOnly) {
      where.status = {
        in: [
          PAYMENT_RECORD_STATUS.SUCCESSFUL,
          PAYMENT_RECORD_STATUS.FAILED,
          PAYMENT_RECORD_STATUS.CANCELLED,
          PAYMENT_RECORD_STATUS.REFUNDED,
          PAYMENT_RECORD_STATUS.PARTIALLY_REFUNDED,
        ],
      };
    }

    if (todayOnly) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      where.transactionDate = { gte: start, lte: end };
    }

    if (startDate || endDate) {
      where.transactionDate = where.transactionDate || {};
      if (startDate) where.transactionDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.transactionDate.lte = end;
      }
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      where.grandTotal = {};
      if (minAmount !== undefined) where.grandTotal.gte = minAmount;
      if (maxAmount !== undefined) where.grandTotal.lte = maxAmount;
    }

    if (search) {
      where.OR = [
        { paymentId: { contains: search, mode: 'insensitive' } },
        { transactionNumber: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { gatewayReference: { contains: search, mode: 'insensitive' } },
        { customer: { fullName: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
        { business: { name: { contains: search, mode: 'insensitive' } } },
        { booking: { bookingNumber: { contains: search, mode: 'insensitive' } } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: PAYMENT_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async update(id, data) {
    return prisma.payment.update({
      where: { id },
      data,
      include: PAYMENT_INCLUDE,
    });
  }

  async getCustomerDashboard(customerId) {
    const where = { customerId, deletedAt: null };
    const [totalPayments, pendingPayments, completedPayments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.count({
        where: {
          ...where,
          status: { in: [PAYMENT_RECORD_STATUS.PENDING, PAYMENT_RECORD_STATUS.PROCESSING] },
        },
      }),
      prisma.payment.count({
        where: { ...where, status: PAYMENT_RECORD_STATUS.SUCCESSFUL },
      }),
    ]);
    return { totalPayments, pendingPayments, completedPayments };
  }

  async getBusinessDashboard({ businessId, businessIds } = {}) {
    const where = { deletedAt: null, status: PAYMENT_RECORD_STATUS.SUCCESSFUL };
    if (businessId) where.businessId = businessId;
    if (businessIds) where.businessId = { in: businessIds };

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [todaysRevenue, monthlyRevenue, refunds] = await Promise.all([
      prisma.payment.aggregate({
        where: { ...where, transactionDate: { gte: startOfDay } },
        _sum: { grandTotal: true },
      }),
      prisma.payment.aggregate({
        where: { ...where, transactionDate: { gte: startOfMonth } },
        _sum: { grandTotal: true },
      }),
      prisma.payment.aggregate({
        where: {
          deletedAt: null,
          businessId: where.businessId,
          status: {
            in: [PAYMENT_RECORD_STATUS.REFUNDED, PAYMENT_RECORD_STATUS.PARTIALLY_REFUNDED],
          },
        },
        _sum: { refundedAmount: true },
      }),
    ]);

    return {
      todaysRevenue: Number(todaysRevenue._sum.grandTotal || 0),
      monthlyRevenue: Number(monthlyRevenue._sum.grandTotal || 0),
      refunds: Number(refunds._sum.refundedAmount || 0),
    };
  }

  async getPlatformDashboard() {
    const where = { deletedAt: null, status: PAYMENT_RECORD_STATUS.SUCCESSFUL };
    const [totalRevenue, platformFees, refunds] = await Promise.all([
      prisma.payment.aggregate({ where, _sum: { grandTotal: true } }),
      prisma.payment.aggregate({ where, _sum: { platformFee: true } }),
      prisma.payment.aggregate({
        where: {
          deletedAt: null,
          status: {
            in: [PAYMENT_RECORD_STATUS.REFUNDED, PAYMENT_RECORD_STATUS.PARTIALLY_REFUNDED],
          },
        },
        _sum: { refundedAmount: true },
      }),
    ]);

    const total = Number(totalRevenue._sum.grandTotal || 0);
    const fees = Number(platformFees._sum.platformFee || 0);

    return {
      totalRevenue: total,
      platformFees: fees,
      businessEarnings: Number((total - fees).toFixed(2)),
      refundSummary: Number(refunds._sum.refundedAmount || 0),
    };
  }
}

module.exports = new PaymentRepository();
