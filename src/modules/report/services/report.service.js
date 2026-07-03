/**
 * Analytics and reports service.
 * Aggregates data from existing modules without modifying them.
 */

const { prisma } = require('../../../prisma');
const AppError = require('../../../utils/AppError');
const { toCsv, toExcelXml, toPdf } = require('../utils/export.helper');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
  BOOKING_STATUS,
  ORDER_STATUS,
  PAYMENT_RECORD_STATUS,
  DRIVER_STATUS,
} = require('../../../constants');

const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN];

class ReportService {
  _hasRole(user, roles) {
    return roles.some((role) => user.roles?.includes(role));
  }

  _dateRange(query = {}) {
    const where = {};
    if (query.startDate || query.endDate) {
      where.gte = query.startDate ? new Date(query.startDate) : undefined;
      where.lte = query.endDate
        ? new Date(new Date(query.endDate).setHours(23, 59, 59, 999))
        : undefined;
    }
    return Object.keys(where).length ? where : null;
  }

  async _ownedBusinessIds(userId) {
    const businesses = await prisma.business.findMany({
      where: { ownerId: userId, deletedAt: null },
      select: { id: true },
    });
    return businesses.map((b) => b.id);
  }

  async _assertAccess(user, { financeOnly = false } = {}) {
    if (this._hasRole(user, [ROLES.SUPER_ADMIN])) return;
    if (this._hasRole(user, [ROLES.FINANCE_ADMIN])) return;
    if (this._hasRole(user, [ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER])) {
      if (financeOnly && !this._hasRole(user, [ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER])) {
        throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
      }
      return;
    }
    throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
  }

  async getDashboard(query, user) {
    await this._assertAccess(user);

    const dateFilter = this._dateRange(query);
    const createdAt = dateFilter ? { createdAt: dateFilter } : {};
    let businessIds = null;

    if (this._hasRole(user, [ROLES.BUSINESS_OWNER]) && !this._hasRole(user, ADMIN_ROLES)) {
      businessIds = await this._ownedBusinessIds(user.id);
    }

    const businessWhere = businessIds
      ? { businessId: { in: businessIds }, ...createdAt }
      : createdAt;

    const [
      users,
      businesses,
      bookings,
      orders,
      payments,
      drivers,
      reviews,
      notifications,
      revenue,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null, ...createdAt } }),
      prisma.business.count({
        where: {
          deletedAt: null,
          ...(businessIds ? { id: { in: businessIds } } : {}),
          ...createdAt,
        },
      }),
      prisma.booking.count({ where: { deletedAt: null, ...businessWhere } }),
      prisma.order.count({
        where: {
          deletedAt: null,
          ...(businessIds ? { businessOrders: { some: { businessId: { in: businessIds } } } } : {}),
          ...createdAt,
        },
      }),
      prisma.payment.count({
        where: {
          deletedAt: null,
          status: PAYMENT_RECORD_STATUS.SUCCESSFUL,
          ...(businessIds ? { businessId: { in: businessIds } } : {}),
          ...(dateFilter ? { transactionDate: dateFilter } : {}),
        },
      }),
      prisma.driver.count({ where: { deletedAt: null, status: DRIVER_STATUS.ACTIVE } }),
      prisma.review.count({
        where: {
          deletedAt: null,
          ...(businessIds ? { businessId: { in: businessIds } } : {}),
          ...createdAt,
        },
      }),
      prisma.notification.count({ where: createdAt }),
      prisma.payment.aggregate({
        where: {
          deletedAt: null,
          status: PAYMENT_RECORD_STATUS.SUCCESSFUL,
          ...(businessIds ? { businessId: { in: businessIds } } : {}),
          ...(dateFilter ? { transactionDate: dateFilter } : {}),
        },
        _sum: { grandTotal: true, platformFee: true, refundedAmount: true },
      }),
    ]);

    return {
      message: SUCCESS_MESSAGES.REPORT_GENERATED,
      dashboard: {
        users,
        businesses,
        bookings,
        orders,
        payments,
        drivers,
        reviews,
        notifications,
        revenue: Number(revenue._sum.grandTotal || 0),
        platformFees: Number(revenue._sum.platformFee || 0),
        refunds: Number(revenue._sum.refundedAmount || 0),
      },
    };
  }

  async getRevenueReport(query, user) {
    await this._assertAccess(user, { financeOnly: true });
    const dateFilter = this._dateRange(query);
    const where = {
      deletedAt: null,
      status: PAYMENT_RECORD_STATUS.SUCCESSFUL,
      ...(query.businessId ? { businessId: query.businessId } : {}),
      ...(dateFilter ? { transactionDate: dateFilter } : {}),
    };

    if (this._hasRole(user, [ROLES.BUSINESS_OWNER]) && !this._hasRole(user, ADMIN_ROLES)) {
      where.businessId = { in: await this._ownedBusinessIds(user.id) };
    }

    const [summary, byMethod, payments] = await Promise.all([
      prisma.payment.aggregate({
        where,
        _sum: { grandTotal: true, platformFee: true, refundedAmount: true, subtotal: true },
        _count: true,
      }),
      prisma.payment.groupBy({
        by: ['paymentMethod'],
        where,
        _sum: { grandTotal: true },
        _count: true,
      }),
      prisma.payment.findMany({
        where,
        select: { transactionDate: true, grandTotal: true },
        orderBy: { transactionDate: 'desc' },
        take: 1000,
      }),
    ]);

    const dayMap = new Map();
    for (const payment of payments) {
      const day = payment.transactionDate.toISOString().slice(0, 10);
      const current = dayMap.get(day) || { day, revenue: 0, count: 0 };
      current.revenue += Number(payment.grandTotal);
      current.count += 1;
      dayMap.set(day, current);
    }
    const byDay = [...dayMap.values()].slice(0, 30);

    return {
      summary: {
        totalRevenue: Number(summary._sum.grandTotal || 0),
        platformFees: Number(summary._sum.platformFee || 0),
        businessEarnings: Number(
          (Number(summary._sum.grandTotal || 0) - Number(summary._sum.platformFee || 0)).toFixed(2),
        ),
        refunds: Number(summary._sum.refundedAmount || 0),
        transactions: summary._count,
      },
      byMethod,
      byDay,
    };
  }

  async getBookingsReport(query, user) {
    await this._assertAccess(user);
    const dateFilter = this._dateRange(query);
    const where = {
      deletedAt: null,
      ...(query.businessId ? { businessId: query.businessId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    };

    if (this._hasRole(user, [ROLES.BUSINESS_OWNER]) && !this._hasRole(user, ADMIN_ROLES)) {
      where.businessId = { in: await this._ownedBusinessIds(user.id) };
    }

    const [total, byStatus, completed, cancelled] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.groupBy({ by: ['status'], where, _count: true }),
      prisma.booking.count({ where: { ...where, status: BOOKING_STATUS.COMPLETED } }),
      prisma.booking.count({ where: { ...where, status: BOOKING_STATUS.CANCELLED } }),
    ]);

    return { total, completed, cancelled, byStatus };
  }

  async getOrdersReport(query, user) {
    await this._assertAccess(user);
    const dateFilter = this._dateRange(query);
    const where = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    };

    if (
      query.businessId ||
      (this._hasRole(user, [ROLES.BUSINESS_OWNER]) && !this._hasRole(user, ADMIN_ROLES))
    ) {
      const businessIds = query.businessId
        ? [query.businessId]
        : await this._ownedBusinessIds(user.id);
      where.businessOrders = { some: { businessId: { in: businessIds } } };
    }

    const [total, byStatus, delivered, cancelled, revenue] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.groupBy({ by: ['status'], where, _count: true }),
      prisma.order.count({ where: { ...where, status: ORDER_STATUS.DELIVERED } }),
      prisma.order.count({ where: { ...where, status: ORDER_STATUS.CANCELLED } }),
      prisma.order.aggregate({
        where: { ...where, status: ORDER_STATUS.DELIVERED },
        _sum: { grandTotal: true },
      }),
    ]);

    return {
      total,
      delivered,
      cancelled,
      byStatus,
      revenue: Number(revenue._sum.grandTotal || 0),
    };
  }

  async getPaymentsReport(query, user) {
    return this.getRevenueReport(query, user);
  }

  async getWalletReport(query, user) {
    await this._assertAccess(user, { financeOnly: true });
    const dateFilter = this._dateRange(query);

    const [wallets, credits, debits, transactions] = await Promise.all([
      prisma.wallet.aggregate({
        where: { deletedAt: null },
        _sum: { currentBalance: true, availableBalance: true },
        _count: true,
      }),
      prisma.walletTransaction.aggregate({
        where: {
          status: 'COMPLETED',
          type: { in: ['CREDIT', 'TOP_UP', 'REFUND', 'CASHBACK', 'PLATFORM_REFUND'] },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
        _sum: { amount: true },
      }),
      prisma.walletTransaction.aggregate({
        where: {
          status: 'COMPLETED',
          type: { in: ['DEBIT', 'REWARD_REDEMPTION'] },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
        _sum: { amount: true },
      }),
      prisma.walletTransaction.groupBy({
        by: ['type'],
        where: {
          status: 'COMPLETED',
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      totalWallets: wallets._count,
      totalBalance: Number(wallets._sum.currentBalance || 0),
      availableBalance: Number(wallets._sum.availableBalance || 0),
      totalCredits: Number(credits._sum.amount || 0),
      totalDebits: Number(debits._sum.amount || 0),
      byType: transactions,
    };
  }

  async getDriversReport(query, user) {
    await this._assertAccess(user);
    const dateFilter = this._dateRange(query);

    const [total, active, online, aggregates, topRated] = await Promise.all([
      prisma.driver.count({ where: { deletedAt: null } }),
      prisma.driver.count({ where: { deletedAt: null, status: DRIVER_STATUS.ACTIVE } }),
      prisma.driver.count({
        where: { deletedAt: null, availabilityStatus: 'ONLINE' },
      }),
      prisma.driver.aggregate({
        where: { deletedAt: null },
        _sum: {
          completedDeliveries: true,
          cancelledDeliveries: true,
          totalDeliveries: true,
        },
        _avg: { rating: true },
      }),
      prisma.driver.findMany({
        where: { deletedAt: null },
        orderBy: { rating: 'desc' },
        take: 10,
        select: {
          id: true,
          driverId: true,
          fullName: true,
          rating: true,
          completedDeliveries: true,
          cancelledDeliveries: true,
        },
      }),
    ]);

    return {
      total,
      active,
      online,
      completedDeliveries: aggregates._sum.completedDeliveries || 0,
      cancelledDeliveries: aggregates._sum.cancelledDeliveries || 0,
      totalDeliveries: aggregates._sum.totalDeliveries || 0,
      averageRating: Number(aggregates._avg.rating || 0),
      topRated,
      period: dateFilter,
    };
  }

  async getCustomersReport(query, user) {
    await this._assertAccess(user);
    const dateFilter = this._dateRange(query);
    const where = { deletedAt: null, ...(dateFilter ? { createdAt: dateFilter } : {}) };

    const [total, active, withBookings, withOrders, topSpenders] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.count({ where: { ...where, status: 'ACTIVE' } }),
      prisma.booking.groupBy({
        by: ['customerId'],
        where: { deletedAt: null },
      }),
      prisma.order.groupBy({
        by: ['customerId'],
        where: { deletedAt: null },
      }),
      prisma.payment.groupBy({
        by: ['customerId'],
        where: { deletedAt: null, status: PAYMENT_RECORD_STATUS.SUCCESSFUL },
        _sum: { grandTotal: true },
        orderBy: { _sum: { grandTotal: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      total,
      active,
      customersWithBookings: withBookings.length,
      customersWithOrders: withOrders.length,
      topSpenders,
    };
  }

  async getBusinessesReport(query, user) {
    await this._assertAccess(user);
    const dateFilter = this._dateRange(query);
    const where = {
      deletedAt: null,
      ...(query.governorateId ? { governorateId: query.governorateId } : {}),
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    };

    if (this._hasRole(user, [ROLES.BUSINESS_OWNER]) && !this._hasRole(user, ADMIN_ROLES)) {
      where.ownerId = user.id;
    }

    const [total, byStatus, byType, popular] = await Promise.all([
      prisma.business.count({ where }),
      prisma.business.groupBy({ by: ['status'], where, _count: true }),
      prisma.business.groupBy({ by: ['type'], where, _count: true }),
      prisma.payment.groupBy({
        by: ['businessId'],
        where: {
          deletedAt: null,
          status: PAYMENT_RECORD_STATUS.SUCCESSFUL,
          businessId: { not: null },
        },
        _sum: { grandTotal: true },
        _count: true,
        orderBy: { _sum: { grandTotal: 'desc' } },
        take: 10,
      }),
    ]);

    return { total, byStatus, byType, popularBusinesses: popular };
  }

  async exportReport(query, user) {
    const reportType = query.type || 'dashboard';
    let data = {};

    switch (reportType) {
      case 'revenue':
      case 'payments':
        data = await this.getRevenueReport(query, user);
        break;
      case 'bookings':
        data = await this.getBookingsReport(query, user);
        break;
      case 'orders':
        data = await this.getOrdersReport(query, user);
        break;
      case 'wallet':
        data = await this.getWalletReport(query, user);
        break;
      case 'drivers':
        data = await this.getDriversReport(query, user);
        break;
      case 'customers':
        data = await this.getCustomersReport(query, user);
        break;
      case 'businesses':
        data = await this.getBusinessesReport(query, user);
        break;
      default:
        data = (await this.getDashboard(query, user)).dashboard;
    }

    const rows = this._toRows(data);
    const format = (query.format || 'csv').toLowerCase();
    const filename = `coresy-${reportType}-${Date.now()}`;

    if (format === 'pdf') {
      return {
        message: SUCCESS_MESSAGES.REPORT_EXPORTED,
        contentType: 'application/pdf',
        filename: `${filename}.pdf`,
        content: toPdf(`CoreSY ${reportType} report`, rows),
      };
    }

    if (format === 'excel' || format === 'xls' || format === 'xlsx') {
      return {
        message: SUCCESS_MESSAGES.REPORT_EXPORTED,
        contentType: 'application/vnd.ms-excel',
        filename: `${filename}.xls`,
        content: toExcelXml(rows, reportType),
      };
    }

    return {
      message: SUCCESS_MESSAGES.REPORT_EXPORTED,
      contentType: 'text/csv',
      filename: `${filename}.csv`,
      content: toCsv(rows),
    };
  }

  _toRows(data) {
    if (Array.isArray(data)) return data;
    if (data?.byDay) return data.byDay;
    if (data?.byStatus) {
      return data.byStatus.map((item) => ({
        status: item.status,
        count: item._count?.status || item._count || 0,
      }));
    }
    if (data?.byMethod) {
      return data.byMethod.map((item) => ({
        paymentMethod: item.paymentMethod,
        revenue: Number(item._sum?.grandTotal || 0),
        count: item._count || 0,
      }));
    }
    if (data?.topRated) return data.topRated;
    if (data?.topSpenders) {
      return data.topSpenders.map((item) => ({
        customerId: item.customerId,
        totalSpent: Number(item._sum?.grandTotal || 0),
      }));
    }
    if (data?.popularBusinesses) {
      return data.popularBusinesses.map((item) => ({
        businessId: item.businessId,
        revenue: Number(item._sum?.grandTotal || 0),
        payments: item._count || 0,
      }));
    }
    if (data?.summary) {
      return [data.summary];
    }
    return [data];
  }
}

module.exports = new ReportService();
