/**
 * Admin dashboard repository.
 * PostgreSQL/Prisma aggregates across all platform modules.
 */

const { prisma } = require('../../../prisma');
const {
  USER_STATUS,
  BUSINESS_STATUS,
  BOOKING_STATUS,
  ORDER_STATUS,
  PRODUCT_STATUS,
  DRIVER_AVAILABILITY_STATUS,
  PAYMENT_RECORD_STATUS,
  PAYMENT_METHOD_TYPE,
  NOTIFICATION_DELIVERY_STATUS,
  SUBSCRIPTION_TIERS,
} = require('../../../constants');

class DashboardRepository {
  _periodRange(period) {
    const now = new Date();
    const start = new Date(now);

    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      start.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      start.setMonth(now.getMonth() - 1);
    } else if (period === 'year') {
      start.setFullYear(now.getFullYear() - 1);
    } else {
      return null;
    }

    return { gte: start, lte: now };
  }

  _dateFilter(query = {}) {
    if (query.startDate || query.endDate) {
      return {
        gte: query.startDate ? new Date(query.startDate) : undefined,
        lte: query.endDate
          ? new Date(new Date(query.endDate).setHours(23, 59, 59, 999))
          : undefined,
      };
    }
    return null;
  }

  async getOverviewCards(query = {}) {
    const dateFilter = this._dateFilter(query);
    const createdAt = dateFilter ? { createdAt: dateFilter } : {};

    const [
      totalUsers,
      totalBusinesses,
      totalBranches,
      totalServices,
      totalCashiers,
      totalDrivers,
      totalProducts,
      totalOrders,
      totalReservations,
      totalBookings,
      totalPayments,
      walletBalance,
      rewardPoints,
      totalNotifications,
      totalReviews,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null, ...createdAt } }),
      prisma.business.count({ where: { deletedAt: null, ...createdAt } }),
      prisma.branch.count({ where: { deletedAt: null, ...createdAt } }),
      prisma.service.count({ where: { deletedAt: null, ...createdAt } }),
      prisma.cashier.count({ where: { deletedAt: null, ...createdAt } }),
      prisma.driver.count({ where: { deletedAt: null, ...createdAt } }),
      prisma.product.count({
        where: { deletedAt: null, status: { not: PRODUCT_STATUS.DELETED }, ...createdAt },
      }),
      prisma.order.count({ where: { deletedAt: null, ...createdAt } }),
      prisma.booking.count({
        where: {
          deletedAt: null,
          bookingType: 'RESERVATION',
          ...createdAt,
        },
      }),
      prisma.booking.count({ where: { deletedAt: null, ...createdAt } }),
      prisma.payment.count({ where: { deletedAt: null, ...createdAt } }),
      prisma.wallet.aggregate({
        where: { deletedAt: null },
        _sum: { currentBalance: true },
      }),
      prisma.pointAccount.aggregate({
        _sum: { availablePoints: true, lifetimePoints: true },
      }),
      prisma.notification.count({ where: createdAt }),
      prisma.review.count({
        where: { deletedAt: null, status: { not: 'DELETED' }, ...createdAt },
      }),
    ]);

    return {
      totalUsers,
      totalBusinesses,
      totalBranches,
      totalServices,
      totalCashiers,
      totalDrivers,
      totalProducts,
      totalOrders,
      totalReservations,
      totalBookings,
      totalPayments,
      totalWalletBalance: Number(walletBalance._sum.currentBalance || 0),
      totalRewardPoints: rewardPoints._sum.availablePoints || 0,
      totalLifetimePoints: rewardPoints._sum.lifetimePoints || 0,
      totalNotifications,
      totalReviews,
    };
  }

  async getFinancialSummary(query = {}) {
    const paymentWhere = (range) => ({
      deletedAt: null,
      status: PAYMENT_RECORD_STATUS.SUCCESSFUL,
      ...(query.businessId ? { businessId: query.businessId } : {}),
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
      ...(range ? { transactionDate: range } : {}),
    });

    const [today, week, month, year, allTime, walletTx] = await Promise.all([
      prisma.payment.aggregate({
        where: paymentWhere(this._periodRange('today')),
        _sum: { grandTotal: true, platformFee: true, refundedAmount: true },
      }),
      prisma.payment.aggregate({
        where: paymentWhere(this._periodRange('week')),
        _sum: { grandTotal: true, platformFee: true, refundedAmount: true },
      }),
      prisma.payment.aggregate({
        where: paymentWhere(this._periodRange('month')),
        _sum: { grandTotal: true, platformFee: true, refundedAmount: true },
      }),
      prisma.payment.aggregate({
        where: paymentWhere(this._periodRange('year')),
        _sum: { grandTotal: true, platformFee: true, refundedAmount: true },
      }),
      prisma.payment.aggregate({
        where: paymentWhere(this._dateFilter(query)),
        _sum: { grandTotal: true, platformFee: true, refundedAmount: true },
      }),
      prisma.walletTransaction.count({
        where: {
          status: 'COMPLETED',
          ...(this._dateFilter(query) ? { createdAt: this._dateFilter(query) } : {}),
        },
      }),
    ]);

    const mapRevenue = (agg) => {
      const revenue = Number(agg._sum.grandTotal || 0);
      const platformEarnings = Number(agg._sum.platformFee || 0);
      return {
        revenue,
        platformEarnings,
        businessEarnings: Number((revenue - platformEarnings).toFixed(2)),
        refundAmount: Number(agg._sum.refundedAmount || 0),
      };
    };

    return {
      today: mapRevenue(today),
      weekly: mapRevenue(week),
      monthly: mapRevenue(month),
      yearly: mapRevenue(year),
      overall: mapRevenue(allTime),
      walletTransactions: walletTx,
    };
  }

  async getBookingSummary(query = {}) {
    const where = {
      deletedAt: null,
      ...(query.businessId ? { businessId: query.businessId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(this._dateFilter(query) ? { createdAt: this._dateFilter(query) } : {}),
    };

    const statuses = Object.values(BOOKING_STATUS);
    const counts = await Promise.all(
      statuses.map((status) => prisma.booking.count({ where: { ...where, status } })),
    );

    return statuses.reduce((acc, status, index) => {
      acc[status] = counts[index];
      return acc;
    }, {});
  }

  async getOrderSummary(query = {}) {
    const where = {
      deletedAt: null,
      ...(this._dateFilter(query) ? { createdAt: this._dateFilter(query) } : {}),
      ...(query.businessId ? { businessOrders: { some: { businessId: query.businessId } } } : {}),
    };

    const statuses = Object.values(ORDER_STATUS);
    const counts = await Promise.all(
      statuses.map((status) => prisma.order.count({ where: { ...where, status } })),
    );

    return statuses.reduce((acc, status, index) => {
      acc[status] = counts[index];
      return acc;
    }, {});
  }

  async getDriverSummary() {
    const [online, offline, busy, onDelivery, aggregates] = await Promise.all([
      prisma.driver.count({
        where: { deletedAt: null, availabilityStatus: DRIVER_AVAILABILITY_STATUS.ONLINE },
      }),
      prisma.driver.count({
        where: { deletedAt: null, availabilityStatus: DRIVER_AVAILABILITY_STATUS.OFFLINE },
      }),
      prisma.driver.count({
        where: { deletedAt: null, availabilityStatus: DRIVER_AVAILABILITY_STATUS.BUSY },
      }),
      prisma.driver.count({
        where: { deletedAt: null, availabilityStatus: DRIVER_AVAILABILITY_STATUS.ON_DELIVERY },
      }),
      prisma.driver.aggregate({
        where: { deletedAt: null },
        _sum: { completedDeliveries: true, cancelledDeliveries: true },
      }),
    ]);

    return {
      onlineDrivers: online,
      offlineDrivers: offline,
      busyDrivers: busy + onDelivery,
      completedDeliveries: aggregates._sum.completedDeliveries || 0,
      cancelledDeliveries: aggregates._sum.cancelledDeliveries || 0,
    };
  }

  async getBusinessSummary(query = {}) {
    const dateFilter = this._dateFilter(query);
    const [topBusinesses, newBusinesses, suspended, inactive] = await Promise.all([
      prisma.payment.groupBy({
        by: ['businessId'],
        where: {
          deletedAt: null,
          status: PAYMENT_RECORD_STATUS.SUCCESSFUL,
          businessId: { not: null },
          ...(dateFilter ? { transactionDate: dateFilter } : {}),
        },
        _sum: { grandTotal: true },
        _count: true,
        orderBy: { _sum: { grandTotal: 'desc' } },
        take: 10,
      }),
      prisma.business.count({
        where: {
          deletedAt: null,
          createdAt: this._periodRange('month') || undefined,
        },
      }),
      prisma.business.count({
        where: { deletedAt: null, status: BUSINESS_STATUS.SUSPENDED },
      }),
      prisma.business.count({
        where: { deletedAt: null, status: BUSINESS_STATUS.INACTIVE },
      }),
    ]);

    return {
      topBusinesses: topBusinesses.map((item) => ({
        businessId: item.businessId,
        revenue: Number(item._sum.grandTotal || 0),
        payments: item._count,
      })),
      newBusinesses,
      suspendedBusinesses: suspended,
      inactiveBusinesses: inactive,
    };
  }

  async getCustomerSummary(query = {}) {
    const dateFilter = this._dateFilter(query);
    const [newUsers, activeUsers, inactiveUsers, subscribers] = await Promise.all([
      prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: this._periodRange('month') || dateFilter || undefined,
        },
      }),
      prisma.user.count({ where: { deletedAt: null, status: USER_STATUS.ACTIVE } }),
      prisma.user.count({
        where: {
          deletedAt: null,
          status: { in: [USER_STATUS.SUSPENDED, USER_STATUS.DEACTIVATED] },
        },
      }),
      prisma.user.count({
        where: {
          deletedAt: null,
          subscription: { in: [SUBSCRIPTION_TIERS.PREMIUM, SUBSCRIPTION_TIERS.ENTERPRISE] },
        },
      }),
    ]);

    return { newUsers, activeUsers, inactiveUsers, subscribers };
  }

  async getProductSummary(query = {}) {
    const where = {
      deletedAt: null,
      status: { not: PRODUCT_STATUS.DELETED },
      ...(query.businessId ? { businessId: query.businessId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
    };

    const [total, active, outOfStock, featured, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.count({ where: { ...where, status: PRODUCT_STATUS.ACTIVE } }),
      prisma.product.count({
        where: {
          ...where,
          OR: [
            { status: PRODUCT_STATUS.OUT_OF_STOCK },
            { unlimitedStock: false, stockQuantity: { lte: 0 } },
          ],
        },
      }),
      prisma.product.count({ where: { ...where, isFeatured: true } }),
      prisma.product.findMany({
        where: { ...where, unlimitedStock: false, stockQuantity: { gt: 0 } },
        select: { stockQuantity: true, lowStockThreshold: true },
      }),
    ]);

    const lowStock = products.filter(
      (product) => product.stockQuantity <= product.lowStockThreshold,
    ).length;

    return {
      totalProducts: total,
      activeProducts: active,
      lowStock,
      outOfStock,
      featuredProducts: featured,
    };
  }

  async getPaymentSummary(query = {}) {
    const dateFilter = this._dateFilter(query);
    const base = {
      deletedAt: null,
      ...(query.businessId ? { businessId: query.businessId } : {}),
      ...(dateFilter ? { transactionDate: dateFilter } : {}),
    };

    const [cash, wallet, card, pending, refunded] = await Promise.all([
      prisma.payment.count({
        where: {
          ...base,
          paymentMethod: PAYMENT_METHOD_TYPE.CASH,
          status: PAYMENT_RECORD_STATUS.SUCCESSFUL,
        },
      }),
      prisma.payment.count({
        where: {
          ...base,
          paymentMethod: PAYMENT_METHOD_TYPE.WALLET,
          status: PAYMENT_RECORD_STATUS.SUCCESSFUL,
        },
      }),
      prisma.payment.count({
        where: {
          ...base,
          paymentMethod: {
            in: [
              PAYMENT_METHOD_TYPE.CREDIT_CARD,
              PAYMENT_METHOD_TYPE.DEBIT_CARD,
              PAYMENT_METHOD_TYPE.APPLE_PAY,
              PAYMENT_METHOD_TYPE.GOOGLE_PAY,
              PAYMENT_METHOD_TYPE.STRIPE,
              PAYMENT_METHOD_TYPE.PAYPAL,
            ],
          },
          status: PAYMENT_RECORD_STATUS.SUCCESSFUL,
        },
      }),
      prisma.payment.count({
        where: {
          ...base,
          status: { in: [PAYMENT_RECORD_STATUS.PENDING, PAYMENT_RECORD_STATUS.PROCESSING] },
        },
      }),
      prisma.payment.count({
        where: {
          ...base,
          status: {
            in: [PAYMENT_RECORD_STATUS.REFUNDED, PAYMENT_RECORD_STATUS.PARTIALLY_REFUNDED],
          },
        },
      }),
    ]);

    return {
      cashPayments: cash,
      walletPayments: wallet,
      cardPayments: card,
      pendingPayments: pending,
      refundedPayments: refunded,
    };
  }

  async getReviewSummary() {
    const [average, topBusinesses, topDrivers, topProducts] = await Promise.all([
      prisma.review.aggregate({
        where: { deletedAt: null, status: 'PUBLISHED' },
        _avg: { overallRating: true },
        _count: true,
      }),
      prisma.review.groupBy({
        by: ['businessId'],
        where: { deletedAt: null, status: 'PUBLISHED', businessId: { not: null } },
        _avg: { overallRating: true },
        _count: true,
        orderBy: { _avg: { overallRating: 'desc' } },
        take: 5,
      }),
      prisma.review.groupBy({
        by: ['driverId'],
        where: { deletedAt: null, status: 'PUBLISHED', driverId: { not: null } },
        _avg: { overallRating: true },
        _count: true,
        orderBy: { _avg: { overallRating: 'desc' } },
        take: 5,
      }),
      prisma.review.groupBy({
        by: ['productId'],
        where: { deletedAt: null, status: 'PUBLISHED', productId: { not: null } },
        _avg: { overallRating: true },
        _count: true,
        orderBy: { _avg: { overallRating: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      averageRating: Number((average._avg.overallRating || 0).toFixed(2)),
      totalReviews: average._count,
      topRatedBusinesses: topBusinesses,
      topRatedDrivers: topDrivers,
      topRatedProducts: topProducts,
    };
  }

  async getNotificationSummary() {
    const [sent, delivered, failed, unread] = await Promise.all([
      prisma.notification.count({
        where: {
          deliveryStatus: {
            in: [
              NOTIFICATION_DELIVERY_STATUS.SENT,
              NOTIFICATION_DELIVERY_STATUS.DELIVERED,
              NOTIFICATION_DELIVERY_STATUS.READ,
            ],
          },
        },
      }),
      prisma.notification.count({
        where: {
          deliveryStatus: {
            in: [NOTIFICATION_DELIVERY_STATUS.DELIVERED, NOTIFICATION_DELIVERY_STATUS.READ],
          },
        },
      }),
      prisma.notification.count({
        where: { deliveryStatus: NOTIFICATION_DELIVERY_STATUS.FAILED },
      }),
      prisma.notification.count({ where: { isRead: false } }),
    ]);

    return { sent, delivered, failed, unread };
  }

  async getRecentActivities(limit = 10) {
    const [
      bookings,
      orders,
      payments,
      walletTransactions,
      reviews,
      notifications,
      businesses,
      drivers,
    ] = await Promise.all([
      prisma.booking.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          customerId: true,
          businessId: true,
          createdAt: true,
        },
      }),
      prisma.order.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          customerId: true,
          grandTotal: true,
          createdAt: true,
        },
      }),
      prisma.payment.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          paymentId: true,
          status: true,
          paymentMethod: true,
          grandTotal: true,
          customerId: true,
          createdAt: true,
        },
      }),
      prisma.walletTransaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          transactionId: true,
          type: true,
          amount: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.review.findMany({
        where: { deletedAt: null, status: { not: 'DELETED' } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          reviewId: true,
          overallRating: true,
          customerId: true,
          businessId: true,
          createdAt: true,
        },
      }),
      prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          notificationId: true,
          title: true,
          type: true,
          userId: true,
          isRead: true,
          createdAt: true,
        },
      }),
      prisma.business.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, name: true, status: true, type: true, createdAt: true },
      }),
      prisma.driver.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          driverId: true,
          fullName: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      bookings,
      orders,
      payments,
      walletTransactions,
      reviews,
      notifications,
      businessRegistrations: businesses,
      driverRegistrations: drivers,
    };
  }

  async getCharts(query = {}) {
    const payments = await prisma.payment.findMany({
      where: {
        deletedAt: null,
        status: PAYMENT_RECORD_STATUS.SUCCESSFUL,
        ...(query.businessId ? { businessId: query.businessId } : {}),
        ...(this._dateFilter(query) ? { transactionDate: this._dateFilter(query) } : {}),
      },
      select: { transactionDate: true, grandTotal: true },
      orderBy: { transactionDate: 'asc' },
      take: 2000,
    });

    const bookings = await prisma.booking.findMany({
      where: {
        deletedAt: null,
        ...(this._dateFilter(query) ? { createdAt: this._dateFilter(query) } : {}),
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 2000,
    });

    const orders = await prisma.order.findMany({
      where: {
        deletedAt: null,
        ...(this._dateFilter(query) ? { createdAt: this._dateFilter(query) } : {}),
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 2000,
    });

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(this._dateFilter(query) ? { createdAt: this._dateFilter(query) } : {}),
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 2000,
    });

    const drivers = await prisma.driver.findMany({
      where: {
        deletedAt: null,
        ...(this._dateFilter(query) ? { createdAt: this._dateFilter(query) } : {}),
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 2000,
    });

    const businesses = await prisma.business.findMany({
      where: {
        deletedAt: null,
        ...(this._dateFilter(query) ? { createdAt: this._dateFilter(query) } : {}),
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 2000,
    });

    return {
      dailyRevenue: this._groupByDay(payments, 'transactionDate', 'grandTotal'),
      monthlyRevenue: this._groupByMonth(payments, 'transactionDate', 'grandTotal'),
      bookingTrends: this._groupByDay(bookings, 'createdAt'),
      orderTrends: this._groupByDay(orders, 'createdAt'),
      registrationTrends: this._groupByDay(users, 'createdAt'),
      driverTrends: this._groupByDay(drivers, 'createdAt'),
      businessTrends: this._groupByDay(businesses, 'createdAt'),
      paymentTrends: this._groupByDay(payments, 'transactionDate'),
    };
  }

  async search(query = {}) {
    const term = query.search || query.q;
    if (!term) {
      return { users: [], businesses: [], bookings: [], orders: [], payments: [] };
    }

    const [users, businesses, bookings, orders, payments] = await Promise.all([
      prisma.user.findMany({
        where: {
          deletedAt: null,
          OR: [
            { fullName: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
            { phoneNumber: { contains: term, mode: 'insensitive' } },
            { passId: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: { id: true, fullName: true, email: true, passId: true, status: true },
      }),
      prisma.business.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { businessEmail: { contains: term, mode: 'insensitive' } },
            { registrationNumber: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: { id: true, name: true, status: true, type: true },
      }),
      prisma.booking.findMany({
        where: {
          deletedAt: null,
          bookingNumber: { contains: term, mode: 'insensitive' },
        },
        take: 10,
        select: { id: true, bookingNumber: true, status: true, createdAt: true },
      }),
      prisma.order.findMany({
        where: {
          deletedAt: null,
          orderNumber: { contains: term, mode: 'insensitive' },
        },
        take: 10,
        select: { id: true, orderNumber: true, status: true, grandTotal: true, createdAt: true },
      }),
      prisma.payment.findMany({
        where: {
          deletedAt: null,
          OR: [
            { paymentId: { contains: term, mode: 'insensitive' } },
            { transactionNumber: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: {
          id: true,
          paymentId: true,
          transactionNumber: true,
          status: true,
          grandTotal: true,
          createdAt: true,
        },
      }),
    ]);

    return { users, businesses, bookings, orders, payments };
  }

  _groupByDay(items, dateField, valueField = null) {
    const map = new Map();
    for (const item of items) {
      const day = item[dateField].toISOString().slice(0, 10);
      const current = map.get(day) || { date: day, count: 0, value: 0 };
      current.count += 1;
      if (valueField) current.value += Number(item[valueField] || 0);
      map.set(day, current);
    }
    return [...map.values()];
  }

  _groupByMonth(items, dateField, valueField = null) {
    const map = new Map();
    for (const item of items) {
      const month = item[dateField].toISOString().slice(0, 7);
      const current = map.get(month) || { month, count: 0, value: 0 };
      current.count += 1;
      if (valueField) current.value += Number(item[valueField] || 0);
      map.set(month, current);
    }
    return [...map.values()];
  }
}

module.exports = new DashboardRepository();
