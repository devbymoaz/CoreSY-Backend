/**
 * Admin dashboard service.
 * Role-aware platform overview, KPIs, charts, and exports.
 */

const dashboardRepository = require('../repositories/dashboard.repository');
const { toCsv, toExcelXml, toPdf } = require('../../report/utils/export.helper');
const AppError = require('../../../utils/AppError');
const { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES, ROLES } = require('../../../constants');

class DashboardService {
  _hasRole(user, roles) {
    return roles.some((role) => user.roles?.includes(role));
  }

  _assertAdminAccess(user, section = 'full') {
    if (this._hasRole(user, [ROLES.SUPER_ADMIN])) return 'full';

    if (this._hasRole(user, [ROLES.FINANCE_ADMIN])) {
      if (['full', 'financial', 'payments', 'charts', 'recent'].includes(section)) {
        return 'finance';
      }
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    if (this._hasRole(user, [ROLES.SUPPORT_ADMIN])) {
      if (
        [
          'full',
          'bookings',
          'orders',
          'customers',
          'businesses',
          'drivers',
          'reviews',
          'notifications',
          'charts',
          'recent',
          'search',
        ].includes(section)
      ) {
        return 'support';
      }
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
  }

  async getOverview(query, user) {
    const access = this._assertAdminAccess(user, 'full');

    if (access === 'finance') {
      const [cards, financial, payments] = await Promise.all([
        dashboardRepository.getOverviewCards(query),
        dashboardRepository.getFinancialSummary(query),
        dashboardRepository.getPaymentSummary(query),
      ]);

      return {
        message: SUCCESS_MESSAGES.DASHBOARD_LOADED,
        access: 'finance',
        cards: {
          totalPayments: cards.totalPayments,
          totalWalletBalance: cards.totalWalletBalance,
          totalRewardPoints: cards.totalRewardPoints,
        },
        financial,
        payments,
      };
    }

    if (access === 'support') {
      const [cards, bookings, orders, customers, businesses, drivers, reviews, notifications] =
        await Promise.all([
          dashboardRepository.getOverviewCards(query),
          dashboardRepository.getBookingSummary(query),
          dashboardRepository.getOrderSummary(query),
          dashboardRepository.getCustomerSummary(query),
          dashboardRepository.getBusinessSummary(query),
          dashboardRepository.getDriverSummary(),
          dashboardRepository.getReviewSummary(),
          dashboardRepository.getNotificationSummary(),
        ]);

      return {
        message: SUCCESS_MESSAGES.DASHBOARD_LOADED,
        access: 'support',
        cards: {
          totalUsers: cards.totalUsers,
          totalBusinesses: cards.totalBusinesses,
          totalBookings: cards.totalBookings,
          totalOrders: cards.totalOrders,
          totalDrivers: cards.totalDrivers,
          totalReviews: cards.totalReviews,
          totalNotifications: cards.totalNotifications,
        },
        bookings,
        orders,
        customers,
        businesses,
        drivers,
        reviews,
        notifications,
      };
    }

    const [
      cards,
      financial,
      bookings,
      orders,
      drivers,
      businesses,
      customers,
      products,
      payments,
      reviews,
      notifications,
    ] = await Promise.all([
      dashboardRepository.getOverviewCards(query),
      dashboardRepository.getFinancialSummary(query),
      dashboardRepository.getBookingSummary(query),
      dashboardRepository.getOrderSummary(query),
      dashboardRepository.getDriverSummary(),
      dashboardRepository.getBusinessSummary(query),
      dashboardRepository.getCustomerSummary(query),
      dashboardRepository.getProductSummary(query),
      dashboardRepository.getPaymentSummary(query),
      dashboardRepository.getReviewSummary(),
      dashboardRepository.getNotificationSummary(),
    ]);

    return {
      message: SUCCESS_MESSAGES.DASHBOARD_LOADED,
      access: 'full',
      cards,
      financial,
      bookings,
      orders,
      drivers,
      businesses,
      customers,
      products,
      payments,
      reviews,
      notifications,
    };
  }

  async getFinancial(query, user) {
    this._assertAdminAccess(user, 'financial');
    const financial = await dashboardRepository.getFinancialSummary(query);
    return { message: SUCCESS_MESSAGES.DASHBOARD_LOADED, financial };
  }

  async getBookings(query, user) {
    this._assertAdminAccess(user, 'bookings');
    const bookings = await dashboardRepository.getBookingSummary(query);
    return { message: SUCCESS_MESSAGES.DASHBOARD_LOADED, bookings };
  }

  async getOrders(query, user) {
    this._assertAdminAccess(user, 'orders');
    const orders = await dashboardRepository.getOrderSummary(query);
    return { message: SUCCESS_MESSAGES.DASHBOARD_LOADED, orders };
  }

  async getPayments(query, user) {
    this._assertAdminAccess(user, 'payments');
    const payments = await dashboardRepository.getPaymentSummary(query);
    return { message: SUCCESS_MESSAGES.DASHBOARD_LOADED, payments };
  }

  async getBusinesses(query, user) {
    this._assertAdminAccess(user, 'businesses');
    const businesses = await dashboardRepository.getBusinessSummary(query);
    return { message: SUCCESS_MESSAGES.DASHBOARD_LOADED, businesses };
  }

  async getCustomers(query, user) {
    this._assertAdminAccess(user, 'customers');
    const customers = await dashboardRepository.getCustomerSummary(query);
    return { message: SUCCESS_MESSAGES.DASHBOARD_LOADED, customers };
  }

  async getDrivers(query, user) {
    this._assertAdminAccess(user, 'drivers');
    const drivers = await dashboardRepository.getDriverSummary(query);
    return { message: SUCCESS_MESSAGES.DASHBOARD_LOADED, drivers };
  }

  async getProducts(query, user) {
    this._assertAdminAccess(user, 'full');
    const products = await dashboardRepository.getProductSummary(query);
    return { message: SUCCESS_MESSAGES.DASHBOARD_LOADED, products };
  }

  async getReviews(query, user) {
    this._assertAdminAccess(user, 'reviews');
    const reviews = await dashboardRepository.getReviewSummary(query);
    return { message: SUCCESS_MESSAGES.DASHBOARD_LOADED, reviews };
  }

  async getNotifications(query, user) {
    this._assertAdminAccess(user, 'notifications');
    const notifications = await dashboardRepository.getNotificationSummary(query);
    return { message: SUCCESS_MESSAGES.DASHBOARD_LOADED, notifications };
  }

  async getCharts(query, user) {
    this._assertAdminAccess(user, 'charts');
    const charts = await dashboardRepository.getCharts(query);
    return { message: SUCCESS_MESSAGES.DASHBOARD_LOADED, charts };
  }

  async getRecentActivities(query, user) {
    this._assertAdminAccess(user, 'recent');
    const limit = Number(query.limit) || 10;
    const recentActivities = await dashboardRepository.getRecentActivities(limit);
    return { message: SUCCESS_MESSAGES.DASHBOARD_LOADED, recentActivities };
  }

  async search(query, user) {
    this._assertAdminAccess(user, 'search');
    const results = await dashboardRepository.search(query);
    return { message: SUCCESS_MESSAGES.DASHBOARD_LOADED, results };
  }

  async exportDashboard(query, user) {
    this._assertAdminAccess(user, 'full');
    const section = query.section || 'overview';
    let payload;

    switch (section) {
      case 'financial':
        payload = await dashboardRepository.getFinancialSummary(query);
        break;
      case 'bookings':
        payload = await dashboardRepository.getBookingSummary(query);
        break;
      case 'orders':
        payload = await dashboardRepository.getOrderSummary(query);
        break;
      case 'payments':
        payload = await dashboardRepository.getPaymentSummary(query);
        break;
      case 'businesses':
        payload = await dashboardRepository.getBusinessSummary(query);
        break;
      case 'customers':
        payload = await dashboardRepository.getCustomerSummary(query);
        break;
      case 'drivers':
        payload = await dashboardRepository.getDriverSummary();
        break;
      case 'products':
        payload = await dashboardRepository.getProductSummary(query);
        break;
      default:
        payload = await dashboardRepository.getOverviewCards(query);
    }

    const rows = Array.isArray(payload) ? payload : [payload];
    const format = (query.format || 'csv').toLowerCase();
    const filename = `admin-dashboard-${section}-${Date.now()}`;

    if (format === 'pdf') {
      return {
        contentType: 'application/pdf',
        filename: `${filename}.pdf`,
        content: toPdf(`CoreSY Admin Dashboard - ${section}`, rows),
      };
    }

    if (format === 'excel' || format === 'xls' || format === 'xlsx') {
      return {
        contentType: 'application/vnd.ms-excel',
        filename: `${filename}.xls`,
        content: toExcelXml(rows, section),
      };
    }

    return {
      contentType: 'text/csv',
      filename: `${filename}.csv`,
      content: toCsv(rows),
    };
  }
}

module.exports = new DashboardService();
