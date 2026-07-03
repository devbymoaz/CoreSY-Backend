/**
 * API route aggregator.
 * Mounts all feature routes under the configured API prefix.
 */

const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const governorateRoutes = require('./governorate.routes');
const debugRoutes = require('./debug.routes');
const rbacRoutes = require('../modules/rbac/routes');
const adminRoutes = require('../modules/admin/routes/admin.routes');
const businessRoutes = require('../modules/business/routes/business.routes');
const branchRoutes = require('../modules/branch/routes/branch.routes');
const serviceRoutes = require('../modules/service/routes/service.routes');
const cashierRoutes = require('../modules/cashier/routes/cashier.routes');
const slotRoutes = require('../modules/slot/routes/slot.routes');
const bookingRoutes = require('../modules/booking/routes/booking.routes');
const qrRoutes = require('../modules/qr/routes/qr.routes');
const productRoutes = require('../modules/product/routes/product.routes');
const productCategoryRoutes = require('../modules/product/routes/product-category.routes');
const orderRoutes = require('../modules/order/routes/order.routes');
const businessOrderRoutes = require('../modules/order/routes/business-order.routes');
const driverRoutes = require('../modules/driver/routes/driver.routes');
const paymentRoutes = require('../modules/payment/routes/payment.routes');
const businessPaymentRoutes = require('../modules/payment/routes/business-payment.routes');
const businessTransactionRoutes = require('../modules/payment/routes/business-transaction.routes');
const adminPaymentRoutes = require('../modules/payment/routes/admin-payment.routes');
const walletRoutes = require('../modules/wallet/routes/wallet.routes');
const adminWalletRoutes = require('../modules/wallet/routes/admin-wallet.routes');
const pointsRoutes = require('../modules/points/routes/points.routes');
const adminPointsRoutes = require('../modules/points/routes/admin-points.routes');
const reviewRoutes = require('../modules/review/routes/review.routes');
const businessReviewRoutes = require('../modules/review/routes/business-review.routes');
const adminReviewRoutes = require('../modules/review/routes/admin-review.routes');

const router = express.Router();

// Mount feature routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/governorates', governorateRoutes);
router.use('/debug', debugRoutes);
router.use('/', rbacRoutes.router);
router.use('/users', rbacRoutes.userRoleRoutes);
router.use('/admins', adminRoutes);
router.use('/businesses', businessRoutes);
router.use('/branches', branchRoutes);
router.use('/services', serviceRoutes);
router.use('/cashiers', cashierRoutes);
router.use('/slots', slotRoutes);
router.use('/bookings', bookingRoutes);
router.use('/qr', qrRoutes);
router.use('/products', productRoutes);
router.use('/product-categories', productCategoryRoutes);
router.use('/orders', orderRoutes);
router.use('/business/orders', businessOrderRoutes);
router.use('/drivers', driverRoutes);
router.use('/payments', paymentRoutes);
router.use('/business/payments', businessPaymentRoutes);
router.use('/business/transactions', businessTransactionRoutes);
router.use('/admin/payments', adminPaymentRoutes);
router.use('/admin/transactions', adminPaymentRoutes);
router.use('/wallet', walletRoutes);
router.use('/admin/wallets', adminWalletRoutes);
router.use('/points', pointsRoutes);
router.use('/admin/points', adminPointsRoutes);
router.use('/reviews', reviewRoutes);
router.use('/business/reviews', businessReviewRoutes);
router.use('/admin/reviews', adminReviewRoutes);

module.exports = router;
