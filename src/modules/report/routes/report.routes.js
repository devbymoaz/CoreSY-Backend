/**
 * Analytics and reports routes.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  getDashboard,
  getRevenue,
  getBookings,
  getOrders,
  getPayments,
  getWallet,
  getDrivers,
  getCustomers,
  getBusinesses,
  exportReport,
} = require('../controllers/report.controller');
const { reportQuerySchema } = require('../validators/report.validator');
const { ROLES } = require('../../../constants');

router.use(authenticate);
router.use(
  authorizeRoles(
    ROLES.SUPER_ADMIN,
    ROLES.FINANCE_ADMIN,
    ROLES.BUSINESS_OWNER,
    ROLES.BUSINESS_MANAGER,
  ),
);

/**
 * @swagger
 * tags:
 *   - name: Reports
 *     description: Analytics and reporting
 */

/**
 * @swagger
 * /reports/dashboard:
 *   get:
 *     summary: Platform/business analytics dashboard
 *     tags: [Reports]
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
 *     responses:
 *       200:
 *         description: Dashboard metrics
 */
router.get('/dashboard', validate({ query: reportQuerySchema }), getDashboard);

/**
 * @swagger
 * /reports/revenue:
 *   get:
 *     summary: Revenue and finance report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue report
 */
router.get('/revenue', validate({ query: reportQuerySchema }), getRevenue);

/**
 * @swagger
 * /reports/bookings:
 *   get:
 *     summary: Bookings report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bookings report
 */
router.get('/bookings', validate({ query: reportQuerySchema }), getBookings);

/**
 * @swagger
 * /reports/orders:
 *   get:
 *     summary: Orders report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orders report
 */
router.get('/orders', validate({ query: reportQuerySchema }), getOrders);

/**
 * @swagger
 * /reports/payments:
 *   get:
 *     summary: Payments report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payments report
 */
router.get('/payments', validate({ query: reportQuerySchema }), getPayments);

/**
 * @swagger
 * /reports/wallet:
 *   get:
 *     summary: Wallet report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet report
 */
router.get('/wallet', validate({ query: reportQuerySchema }), getWallet);

/**
 * @swagger
 * /reports/drivers:
 *   get:
 *     summary: Drivers report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Drivers report
 */
router.get('/drivers', validate({ query: reportQuerySchema }), getDrivers);

/**
 * @swagger
 * /reports/customers:
 *   get:
 *     summary: Customers report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customers report
 */
router.get('/customers', validate({ query: reportQuerySchema }), getCustomers);

/**
 * @swagger
 * /reports/businesses:
 *   get:
 *     summary: Businesses report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Businesses report
 */
router.get('/businesses', validate({ query: reportQuerySchema }), getBusinesses);

/**
 * @swagger
 * /reports/export:
 *   get:
 *     summary: Export report as CSV, Excel, or PDF
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [dashboard, revenue, bookings, orders, payments, wallet, drivers, customers, businesses]
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, excel, pdf]
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
 *     responses:
 *       200:
 *         description: Exported file
 */
router.get('/export', validate({ query: reportQuerySchema }), exportReport);

module.exports = router;
