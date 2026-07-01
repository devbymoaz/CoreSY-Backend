const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  rescheduleBooking,
  getUpcomingBookings,
  getBookingHistory,
  getBusinessBookings,
  getBusinessTodayBookings,
  getBusinessUpcomingBookings,
  confirmBooking,
  rejectBooking,
  checkInBooking,
  checkOutBooking,
  generateQRCode,
  addFavorite,
  removeFavorite,
  getFavorites,
  getCustomerDashboard,
  getBusinessDashboard,
} = require('../controllers/booking.controller');
const {
  createBookingSchema,
  updateBookingSchema,
  cancelBookingSchema,
  rescheduleBookingSchema,
  listBookingsSchema,
} = require('../validators/booking.validator');

router.use(authenticate);

// Customer APIs
/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Booking created
 */
router.post('/', validate({ body: createBookingSchema }), createBooking);

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: Get all bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bookings
 */
router.get('/', validate({ query: listBookingsSchema }), getBookings);

/**
 * @swagger
 * /bookings/upcoming:
 *   get:
 *     summary: Get upcoming bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of upcoming bookings
 */
router.get('/upcoming', getUpcomingBookings);

/**
 * @swagger
 * /bookings/history:
 *   get:
 *     summary: Get booking history
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of booking history
 */
router.get('/history', getBookingHistory);

/**
 * @swagger
 * /bookings/favorites:
 *   get:
 *     summary: Get favorite businesses
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of favorite businesses
 */
router.get('/favorites', getFavorites);

/**
 * @swagger
 * /bookings/dashboard:
 *   get:
 *     summary: Get customer dashboard stats
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
router.get('/dashboard', getCustomerDashboard);

/**
 * @swagger
 * /bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Booking details
 */
router.get('/:id', getBookingById);

/**
 * @swagger
 * /bookings/{id}:
 *   patch:
 *     summary: Update booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Booking updated
 */
router.patch('/:id', validate({ body: updateBookingSchema }), updateBooking);

/**
 * @swagger
 * /bookings/{id}/cancel:
 *   patch:
 *     summary: Cancel booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Booking cancelled
 */
router.patch('/:id/cancel', validate({ body: cancelBookingSchema }), cancelBooking);

/**
 * @swagger
 * /bookings/{id}/reschedule:
 *   patch:
 *     summary: Reschedule booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [slotId]
 *     responses:
 *       200:
 *         description: Booking rescheduled
 */
router.patch('/:id/reschedule', validate({ body: rescheduleBookingSchema }), rescheduleBooking);

/**
 * @swagger
 * /bookings/{id}/qr:
 *   get:
 *     summary: Generate booking QR code
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: QR code generated
 */
router.get('/:id/qr', generateQRCode);

// Favorite Business APIs
/**
 * @swagger
 * /bookings/favorites/{businessId}:
 *   post:
 *     summary: Add business to favorites
 *     tags: [Bookings]
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
 *         description: Business added to favorites
 */
router.post('/favorites/:businessId', addFavorite);

/**
 * @swagger
 * /bookings/favorites/{businessId}:
 *   delete:
 *     summary: Remove business from favorites
 *     tags: [Bookings]
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
 *         description: Business removed from favorites
 */
router.delete('/favorites/:businessId', removeFavorite);

// Business APIs
/**
 * @swagger
 * /bookings/business:
 *   get:
 *     summary: Get business bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of business bookings
 */
router.get('/business', validate({ query: listBookingsSchema }), getBusinessBookings);

/**
 * @swagger
 * /bookings/business/{businessId}/today:
 *   get:
 *     summary: Get today's bookings for business
 *     tags: [Bookings]
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
 *         description: List of today's bookings
 */
router.get('/business/:businessId/today', getBusinessTodayBookings);

/**
 * @swagger
 * /bookings/business/{businessId}/upcoming:
 *   get:
 *     summary: Get upcoming bookings for business
 *     tags: [Bookings]
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
 *         description: List of upcoming bookings
 */
router.get('/business/:businessId/upcoming', getBusinessUpcomingBookings);

/**
 * @swagger
 * /bookings/business/{businessId}/dashboard:
 *   get:
 *     summary: Get business dashboard stats
 *     tags: [Bookings]
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
 */
router.get('/business/:businessId/dashboard', getBusinessDashboard);

/**
 * @swagger
 * /bookings/business/{id}/confirm:
 *   patch:
 *     summary: Confirm booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Booking confirmed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Booking not found
 *       422:
 *         description: Invalid booking status
 *       500:
 *         description: Internal server error
 */
router.patch('/business/:id/confirm', confirmBooking);

/**
 * @swagger
 * /bookings/business/{id}/reject:
 *   patch:
 *     summary: Reject booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Booking rejected
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Booking not found
 *       422:
 *         description: Invalid booking status
 *       500:
 *         description: Internal server error
 */
router.patch('/business/:id/reject', rejectBooking);

/**
 * @swagger
 * /bookings/business/{id}/check-in:
 *   patch:
 *     summary: Check-in a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Check-in successful
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Booking not found
 *       422:
 *         description: Invalid booking status
 *       500:
 *         description: Internal server error
 */
router.patch('/business/:id/check-in', checkInBooking);

/**
 * @swagger
 * /bookings/business/{id}/check-out:
 *   patch:
 *     summary: Check-out a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Check-out successful
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Booking not found
 *       422:
 *         description: Invalid booking status
 *       500:
 *         description: Internal server error
 */
router.patch('/business/:id/check-out', checkOutBooking);

module.exports = router;
