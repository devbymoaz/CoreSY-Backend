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
 *     summary: Get all QR codes with filters and pagination
 *     description: Retrieve a list of QR codes with support for filtering, searching, and pagination
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by booking number, customer name, or QR ID
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by customer ID
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by business ID
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by branch ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [GENERATED, ACTIVE, SCANNED, COMPLETED, EXPIRED, CANCELLED, INVALID]
 *         description: Filter by QR status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of QR codes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     qrCodes:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/', validate({ query: listQRsSchema }), getAllQRs);

/**
 * @swagger
 * /qr/booking/{bookingId}:
 *   get:
 *     summary: Get QR code by booking ID
 *     description: Retrieve a QR code using its associated booking ID
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
 *           example: a7f11770-5f94-445d-bd33-307cdba8f600
 *         description: ID of the booking
 *     responses:
 *       200:
 *         description: QR code details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     qrCode:
 *                       type: object
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - You don't have permission to access this QR code
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
 *     description: Retrieve a QR code using its unique QR ID
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrId
 *         required: true
 *         schema:
 *           type: string
 *           example: QR-1723789123456-ABC123XYZ
 *         description: "Unique QR ID (format: QR-XXXXXXXXX)"
 *     responses:
 *       200:
 *         description: QR code details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     qrCode:
 *                       type: object
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - You don't have permission to access this QR code
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
 *     description: Generate a new QR code for a confirmed booking. QR codes are automatically generated when bookings are confirmed.
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
 *           example: a7f11770-5f94-445d-bd33-307cdba8f600
 *         description: ID of the booking to generate QR code for
 *     responses:
 *       201:
 *         description: QR code generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: QR code generated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     qrCode:
 *                       type: object
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - You don't have permission to generate this QR code
 *       404:
 *         description: Booking not found
 *       409:
 *         description: QR code already exists for this booking
 *       422:
 *         description: Invalid booking status - Booking must be confirmed
 *       500:
 *         description: Internal server error
 */
router.post('/generate/:bookingId', generateQR);

/**
 * @swagger
 * /qr/validate:
 *   post:
 *     summary: Validate QR code
 *     description: Validate a QR code without scanning it. Checks if the QR exists, is active, and not expired.
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
 *                 description: Secure token from the QR code
 *           example:
 *             token: a1b2c3d4e5f6789012345678901234567890abcdef
 *     responses:
 *       200:
 *         description: QR code validated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: QR code validated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     qrCode:
 *                       type: object
 *                     isValid:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - You don't have permission to validate this QR code
 *       404:
 *         description: QR code not found
 *       422:
 *         description: Invalid QR status - QR may be expired, cancelled, or already scanned
 *       500:
 *         description: Internal server error
 */
router.post('/validate', validate({ body: validateQRSchema }), validateQR);

/**
 * @swagger
 * /qr/scan:
 *   post:
 *     summary: Scan QR code
 *     description: Scan a QR code to mark it as scanned and check in the customer
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
 *                 description: Secure token from the QR code
 *           example:
 *             token: a1b2c3d4e5f6789012345678901234567890abcdef
 *     responses:
 *       200:
 *         description: QR code scanned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: QR code scanned successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     qrCode:
 *                       type: object
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - You don't have permission to scan this QR code (must be cashier at the correct branch)
 *       404:
 *         description: QR code not found
 *       422:
 *         description: Invalid QR status - QR may be expired, cancelled, or already scanned
 *       500:
 *         description: Internal server error
 */
router.post('/scan', validate({ body: scanQRSchema }), scanQR);

/**
 * @swagger
 * /qr/{qrId}/check-in:
 *   patch:
 *     summary: Check-in customer
 *     description: Manually check in a customer using the QR ID
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrId
 *         required: true
 *         schema:
 *           type: string
 *           example: QR-1723789123456-ABC123XYZ
 *         description: "Unique QR ID (format: QR-XXXXXXXXX)"
 *     responses:
 *       200:
 *         description: Check-in successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Check-in successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     qrCode:
 *                       type: object
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - You don't have permission to check in this customer
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
 *     description: Check out a customer who has already been checked in
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrId
 *         required: true
 *         schema:
 *           type: string
 *           example: QR-1723789123456-ABC123XYZ
 *         description: "Unique QR ID (format: QR-XXXXXXXXX)"
 *     responses:
 *       200:
 *         description: Check-out successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Check-out successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     qrCode:
 *                       type: object
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - You don't have permission to check out this customer
 *       404:
 *         description: QR code not found
 *       422:
 *         description: Invalid QR status - Customer must be checked in first
 *       500:
 *         description: Internal server error
 */
router.patch('/:qrId/check-out', checkOut);

/**
 * @swagger
 * /qr/{qrId}/cancel:
 *   patch:
 *     summary: Cancel QR code
 *     description: Cancel a QR code and its associated booking
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrId
 *         required: true
 *         schema:
 *           type: string
 *           example: QR-1723789123456-ABC123XYZ
 *         description: "Unique QR ID (format: QR-XXXXXXXXX)"
 *     responses:
 *       200:
 *         description: QR code cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: QR code cancelled successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     qrCode:
 *                       type: object
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - You don't have permission to cancel this QR code
 *       404:
 *         description: QR code not found
 *       422:
 *         description: Cannot cancel - QR code is already completed or cancelled
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
 *     description: Retrieve dashboard statistics for the currently authenticated customer
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         upcomingBookings:
 *                           type: integer
 *                           example: 5
 *                         qrReady:
 *                           type: integer
 *                           example: 3
 *                         checkedIn:
 *                           type: integer
 *                           example: 1
 *                         completed:
 *                           type: integer
 *                           example: 10
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard/customer', getCustomerDashboard);

/**
 * @swagger
 * /qr/dashboard/business/{businessId}:
 *   get:
 *     summary: Get business dashboard stats
 *     description: Retrieve dashboard statistics for a specific business
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
 *           example: a7f11770-5f94-445d-bd33-307cdba8f600
 *         description: ID of the business
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         todayCheckIns:
 *                           type: integer
 *                           example: 15
 *                         todayCheckOuts:
 *                           type: integer
 *                           example: 12
 *                         scannedQrs:
 *                           type: integer
 *                           example: 45
 *                         completedVisits:
 *                           type: integer
 *                           example: 120
 *                         cancelledVisits:
 *                           type: integer
 *                           example: 5
 *                         expiredQrs:
 *                           type: integer
 *                           example: 3
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - You don't have permission to access this business's stats
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
 *     description: Retrieve dashboard statistics for the currently authenticated cashier
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         todayScans:
 *                           type: integer
 *                           example: 8
 *                         todayCheckIns:
 *                           type: integer
 *                           example: 8
 *                         todayCheckOuts:
 *                           type: integer
 *                           example: 6
 *                         pendingCustomers:
 *                           type: integer
 *                           example: 3
 *                         completedCustomers:
 *                           type: integer
 *                           example: 25
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Cashier not found
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard/cashier', getCashierDashboard);

module.exports = router;
