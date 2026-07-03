/**
 * Admin dashboard routes.
 * Platform overview KPIs, charts, recent activity, search, and export.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  getOverview,
  getFinancial,
  getBookings,
  getOrders,
  getPayments,
  getBusinesses,
  getCustomers,
  getDrivers,
  getProducts,
  getReviews,
  getNotifications,
  getCharts,
  getRecentActivities,
  search,
  exportDashboard,
} = require('../controllers/dashboard.controller');
const { dashboardQuerySchema } = require('../validators/dashboard.validator');
const { ROLES } = require('../../../constants');

router.use(authenticate);
router.use(authorizeRoles(ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN, ROLES.SUPPORT_ADMIN));

/**
 * @swagger
 * tags:
 *   - name: Admin Dashboard
 *     description: Platform admin dashboard and system overview APIs
 */

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Full admin dashboard overview
 *     description: Returns role-aware platform cards and summaries. SUPER_ADMIN gets full data, FINANCE_ADMIN financial focus, SUPPORT_ADMIN operational focus.
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Dashboard overview loaded
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Dashboard data loaded successfully.
 *               data:
 *                 access: full
 *                 cards:
 *                   totalUsers: 1200
 *                   totalBusinesses: 85
 *                   totalOrders: 430
 *                   totalWalletBalance: 150000
 */
router.get('/', validate({ query: dashboardQuerySchema }), getOverview);

/**
 * @swagger
 * /admin/dashboard/financial:
 *   get:
 *     summary: Financial summary
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Financial KPIs
 */
router.get('/financial', validate({ query: dashboardQuerySchema }), getFinancial);

/**
 * @swagger
 * /admin/dashboard/bookings:
 *   get:
 *     summary: Booking status summary
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Booking summary
 */
router.get('/bookings', validate({ query: dashboardQuerySchema }), getBookings);

/**
 * @swagger
 * /admin/dashboard/orders:
 *   get:
 *     summary: Order status summary
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order summary
 */
router.get('/orders', validate({ query: dashboardQuerySchema }), getOrders);

/**
 * @swagger
 * /admin/dashboard/payments:
 *   get:
 *     summary: Payment method and status summary
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment summary
 */
router.get('/payments', validate({ query: dashboardQuerySchema }), getPayments);

/**
 * @swagger
 * /admin/dashboard/businesses:
 *   get:
 *     summary: Business summary
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Business summary
 */
router.get('/businesses', validate({ query: dashboardQuerySchema }), getBusinesses);

/**
 * @swagger
 * /admin/dashboard/customers:
 *   get:
 *     summary: Customer summary
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer summary
 */
router.get('/customers', validate({ query: dashboardQuerySchema }), getCustomers);

/**
 * @swagger
 * /admin/dashboard/drivers:
 *   get:
 *     summary: Driver summary
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Driver summary
 */
router.get('/drivers', validate({ query: dashboardQuerySchema }), getDrivers);

/**
 * @swagger
 * /admin/dashboard/products:
 *   get:
 *     summary: Product summary
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product summary
 */
router.get('/products', validate({ query: dashboardQuerySchema }), getProducts);

/**
 * @swagger
 * /admin/dashboard/reviews:
 *   get:
 *     summary: Ratings summary
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ratings summary
 */
router.get('/reviews', validate({ query: dashboardQuerySchema }), getReviews);

/**
 * @swagger
 * /admin/dashboard/notifications:
 *   get:
 *     summary: Notification summary
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification summary
 */
router.get('/notifications', validate({ query: dashboardQuerySchema }), getNotifications);

/**
 * @swagger
 * /admin/dashboard/charts:
 *   get:
 *     summary: Chart datasets for trends
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chart data
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 charts:
 *                   dailyRevenue:
 *                     - date: "2026-07-01"
 *                       count: 12
 *                       value: 4500
 *                   bookingTrends:
 *                     - date: "2026-07-01"
 *                       count: 8
 *                       value: 0
 */
router.get('/charts', validate({ query: dashboardQuerySchema }), getCharts);

/**
 * @swagger
 * /admin/dashboard/recent-activities:
 *   get:
 *     summary: Recent platform activities
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Recent activities feed
 */
router.get('/recent-activities', validate({ query: dashboardQuerySchema }), getRecentActivities);

/**
 * @swagger
 * /admin/dashboard/search:
 *   get:
 *     summary: Global admin search
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results across users, businesses, bookings, orders, payments
 */
router.get('/search', validate({ query: dashboardQuerySchema }), search);

/**
 * @swagger
 * /admin/dashboard/export:
 *   get:
 *     summary: Export dashboard section as CSV, Excel, or PDF
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: section
 *         schema:
 *           type: string
 *           enum: [overview, financial, bookings, orders, payments, businesses, customers, drivers, products]
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, excel, pdf]
 *     responses:
 *       200:
 *         description: Exported file
 */
router.get('/export', validate({ query: dashboardQuerySchema }), exportDashboard);

module.exports = router;
