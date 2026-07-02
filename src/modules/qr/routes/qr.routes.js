const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const {
  generateQR,
  getQRByBookingId,
  getQRByQrId,
  validateQR,
  scanQR,
  checkIn,
  checkOut,
  cancelQR,
  getAllQRs,
  getCustomerDashboard,
  getBusinessDashboard,
  getCashierDashboard,
} = require('../controllers/qr.controller');
const {
  scanQRSchema,
  validateQRSchema,
  listQRsSchema,
} = require('../validators/qr.validator');

router.use(authenticate);

/**
 * @swagger
 * /qr:
 *   get:
 *     summary: Get all QR codes
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of QR codes
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', validate({ query: listQRsSchema }), getAllQRs);

/**
 * @swagger
 * /qr/booking/{bookingId}:
 *   get:
 *     summary: Get QR code by booking ID
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: QR code details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: QR code not found
 *       500:
 *         description: Internal server error
 */
router.get('/booking/:bookingId', getQRByBookingId);

/**
 * @swagger
 * /qr/{qrId}:
 *   get:
 *     summary: Get QR code by QR ID
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: QR code details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: QR code not found
 *       500:
 *         description: Internal server error
 */
router.get('/:qrId', getQRByQrId);

/**
 * @swagger
 * /qr/generate/{bookingId}:
 *   post:
 *     summary: Generate QR code for a booking
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       201:
 *         description: QR code generated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Booking not found
 *       409:
 *         description: QR code already exists
 *       422:
 *         description: Invalid booking status
 *       500:
 *         description: Internal server error
 */
router.post('/generate/:bookingId', generateQR);

/**
 * @swagger
 * /qr/validate:
 *   post:
 *     summary: Validate QR code
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: QR code validated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: QR code not found
 *       422:
 *         description: Invalid QR status
 *       500:
 *         description: Internal server error
 */
router.post('/validate', validate({ body: validateQRSchema }), validateQR);

/**
 * @swagger
 * /qr/scan:
 *   post:
 *     summary: Scan QR code
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: QR code scanned
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: QR code not found
 *       422:
 *         description: Invalid QR status
 *       500:
 *         description: Internal server error
 */
router.post('/scan', validate({ body: scanQRSchema }), scanQR);

/**
 * @swagger
 * /qr/{qrId}/check-in:
 *   patch:
 *     summary: Check-in customer
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Check-in successful
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: QR code not found
 *       422:
 *         description: Invalid QR status
 *       500:
 *         description: Internal server error
 */
router.patch('/:qrId/check-in', checkIn);

/**
 * @swagger
 * /qr/{qrId}/check-out:
 *   patch:
 *     summary: Check-out customer
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Check-out successful
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: QR code not found
 *       422:
 *         description: Invalid QR status
 *       500:
 *         description: Internal server error
 */
router.patch('/:qrId/check-out', checkOut);

/**
 * @swagger
 * /qr/{qrId}/cancel:
 *   patch:
 *     summary: Cancel QR code
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: QR code cancelled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: QR code not found
 *       422:
 *         description: Cannot cancel completed/cancelled QR
 *       500:
 *         description: Internal server error
 */
router.patch('/:qrId/cancel', cancelQR);

// Dashboard APIs
/**
 * @swagger
 * /qr/dashboard/customer:
 *   get:
 *     summary: Get customer dashboard stats
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard/customer', getCustomerDashboard);

/**
 * @swagger
 * /qr/dashboard/business/{businessId}:
 *   get:
 *     summary: Get business dashboard stats
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Dashboard stats
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Business not found
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard/business/:businessId', getBusinessDashboard);

/**
 * @swagger
 * /qr/dashboard/cashier:
 *   get:
 *     summary: Get cashier dashboard stats
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cashier not found
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard/cashier', getCashierDashboard);

module.exports = router;
