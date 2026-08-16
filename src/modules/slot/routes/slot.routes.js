const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const {
  createSlot,
  getSlots,
  getSlotById,
  getServiceSlots,
  getBranchSlots,
  updateSlot,
  deleteSlot,
  updateSlotStatus,
  createRecurringSlots,
  duplicateSlot,
  getDashboardStats,
} = require('../controllers/slot.controller');
const {
  createSlotSchema,
  updateSlotSchema,
  updateSlotStatusSchema,
  listSlotsSchema,
  createRecurringSlotsSchema,
  duplicateSlotSchema,
} = require('../validators/slot.validator');

router.use(authenticate);

/**
 * @swagger
 * /slots/dashboard:
 *   get:
 *     summary: Get slot dashboard stats
 *     tags: [Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: businessId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: branchId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
router.get('/dashboard', getDashboardStats);

/**
 * @swagger
 * /slots/services/{serviceId}:
 *   get:
 *     summary: Get slots for a service
 *     tags: [Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of slots
 */
router.get('/services/:serviceId', getServiceSlots);

/**
 * @swagger
 * /slots/branches/{branchId}:
 *   get:
 *     summary: Get slots for a branch
 *     tags: [Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of slots
 */
router.get('/branches/:branchId', getBranchSlots);

/**
 * @swagger
 * /slots:
 *   get:
 *     summary: Get all slots
 *     tags: [Slots]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of slots
 */
router.get('/', validate({ query: listSlotsSchema }), getSlots);

/**
 * @swagger
 * /slots/{id}:
 *   get:
 *     summary: Get slot by ID
 *     tags: [Slots]
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
 *         description: Slot details
 */
router.get('/:id', getSlotById);

/**
 * @swagger
 * /slots:
 *   post:
 *     summary: Create a new slot
 *     tags: [Slots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceId
 *               - businessId
 *               - branchId
 *               - slotDate
 *               - startTime
 *               - endTime
 *               - duration
 *               - maxCapacity
 *               - bookingType
 *             properties:
 *               serviceId:
 *                 type: string
 *                 format: uuid
 *                 example: a7f11770-5f94-445d-bd33-307cdba8f600
 *               businessId:
 *                 type: string
 *                 format: uuid
 *                 example: b8e22881-6a05-456e-ce44-418decb9f711
 *               branchId:
 *                 type: string
 *                 format: uuid
 *                 example: c9f33992-7b16-567f-df55-529efdc0f822
 *               slotDate:
 *                 type: string
 *                 example: "2026-08-20"
 *               startTime:
 *                 type: string
 *                 pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
 *                 example: "18:00"
 *               endTime:
 *                 type: string
 *                 pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
 *                 example: "20:00"
 *               duration:
 *                 type: integer
 *                 minimum: 1
 *                 example: 120
 *               maxCapacity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 10
 *               bookingType:
 *                 type: string
 *                 enum: [RESERVATION, APPOINTMENT, WALK_IN]
 *                 example: RESERVATION
 *               genderRestriction:
 *                 type: string
 *                 enum: [MALE, FEMALE, BOTH]
 *                 example: BOTH
 *               minAge:
 *                 type: integer
 *                 minimum: 1
 *                 example: 18
 *               maxAge:
 *                 type: integer
 *                 minimum: 1
 *                 example: 65
 *               isRecurring:
 *                 type: boolean
 *                 example: false
 *               recurringType:
 *                 type: string
 *                 enum: [DAILY, WEEKLY, MONTHLY, NONE]
 *                 example: WEEKLY
 *               recurringEndDate:
 *                 type: string
 *                 example: "2026-12-31"
 *           example:
 *             serviceId: a7f11770-5f94-445d-bd33-307cdba8f600
 *             businessId: b8e22881-6a05-456e-ce44-418decb9f711
 *             branchId: c9f33992-7b16-567f-df55-529efdc0f822
 *             slotDate: "2026-08-20"
 *             startTime: "18:00"
 *             endTime: "20:00"
 *             duration: 120
 *             maxCapacity: 10
 *             bookingType: RESERVATION
 *             genderRestriction: BOTH
 *             isRecurring: false
 *     responses:
 *       201:
 *         description: Slot created
 */
router.post('/', validate({ body: createSlotSchema }), createSlot);

/**
 * @swagger
 * /slots/recurring:
 *   post:
 *     summary: Create recurring slots
 *     tags: [Slots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceId
 *               - businessId
 *               - branchId
 *               - startDate
 *               - endDate
 *               - daysOfWeek
 *               - startTime
 *               - endTime
 *               - duration
 *               - maxCapacity
 *               - bookingType
 *             properties:
 *               serviceId:
 *                 type: string
 *                 format: uuid
 *                 example: a7f11770-5f94-445d-bd33-307cdba8f600
 *               businessId:
 *                 type: string
 *                 format: uuid
 *                 example: b8e22881-6a05-456e-ce44-418decb9f711
 *               branchId:
 *                 type: string
 *                 format: uuid
 *                 example: c9f33992-7b16-567f-df55-529efdc0f822
 *               startDate:
 *                 type: string
 *                 example: "2026-08-01"
 *               endDate:
 *                 type: string
 *                 example: "2026-08-31"
 *               daysOfWeek:
 *                 type: array
 *                 items:
 *                   type: integer
 *                   minimum: 0
 *                   maximum: 6
 *                 example: [1, 3, 5]
 *               startTime:
 *                 type: string
 *                 pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
 *                 example: "09:00"
 *               endTime:
 *                 type: string
 *                 pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
 *                 example: "11:00"
 *               duration:
 *                 type: integer
 *                 minimum: 1
 *                 example: 120
 *               maxCapacity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 8
 *               bookingType:
 *                 type: string
 *                 enum: [RESERVATION, APPOINTMENT, WALK_IN]
 *                 example: APPOINTMENT
 *               genderRestriction:
 *                 type: string
 *                 enum: [MALE, FEMALE, BOTH]
 *                 example: BOTH
 *               minAge:
 *                 type: integer
 *                 minimum: 1
 *                 example: 16
 *               maxAge:
 *                 type: integer
 *                 minimum: 1
 *                 example: 60
 *           example:
 *             serviceId: a7f11770-5f94-445d-bd33-307cdba8f600
 *             businessId: b8e22881-6a05-456e-ce44-418decb9f711
 *             branchId: c9f33992-7b16-567f-df55-529efdc0f822
 *             startDate: "2026-08-01"
 *             endDate: "2026-08-31"
 *             daysOfWeek: [1, 3, 5]
 *             startTime: "09:00"
 *             endTime: "11:00"
 *             duration: 120
 *             maxCapacity: 8
 *             bookingType: APPOINTMENT
 *     responses:
 *       201:
 *         description: Recurring slots created
 */
router.post('/recurring', validate({ body: createRecurringSlotsSchema }), createRecurringSlots);

/**
 * @swagger
 * /slots/{id}/duplicate:
 *   post:
 *     summary: Duplicate a slot
 *     tags: [Slots]
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
 *             required:
 *               - newDate
 *             properties:
 *               newDate:
 *                 type: string
 *                 example: "2026-08-25"
 *           example:
 *             newDate: "2026-08-25"
 *     responses:
 *       201:
 *         description: Slot duplicated
 */
router.post('/:id/duplicate', validate({ body: duplicateSlotSchema }), duplicateSlot);

/**
 * @swagger
 * /slots/{id}:
 *   patch:
 *     summary: Update slot
 *     tags: [Slots]
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
 *             properties:
 *               slotDate:
 *                 type: string
 *                 example: "2026-08-21"
 *               startTime:
 *                 type: string
 *                 pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
 *                 example: "19:00"
 *               endTime:
 *                 type: string
 *                 pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
 *                 example: "21:00"
 *               duration:
 *                 type: integer
 *                 minimum: 1
 *                 example: 120
 *               maxCapacity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 12
 *               bookingType:
 *                 type: string
 *                 enum: [RESERVATION, APPOINTMENT, WALK_IN]
 *                 example: RESERVATION
 *               genderRestriction:
 *                 type: string
 *                 enum: [MALE, FEMALE, BOTH]
 *                 example: BOTH
 *               minAge:
 *                 type: integer
 *                 minimum: 1
 *                 example: 18
 *               maxAge:
 *                 type: integer
 *                 minimum: 1
 *                 example: 65
 *               isRecurring:
 *                 type: boolean
 *                 example: false
 *               recurringType:
 *                 type: string
 *                 enum: [DAILY, WEEKLY, MONTHLY, NONE]
 *                 example: NONE
 *               recurringEndDate:
 *                 type: string
 *                 example: "2026-12-31"
 *           example:
 *             startTime: "19:00"
 *             endTime: "21:00"
 *             maxCapacity: 12
 *     responses:
 *       200:
 *         description: Slot updated
 */
router.patch('/:id', validate({ body: updateSlotSchema }), updateSlot);

/**
 * @swagger
 * /slots/{id}/status:
 *   patch:
 *     summary: Update slot status
 *     tags: [Slots]
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [AVAILABLE, FULL, CLOSED, CANCELLED, INACTIVE]
 *                 example: AVAILABLE
 *           example:
 *             status: AVAILABLE
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', validate({ body: updateSlotStatusSchema }), updateSlotStatus);

/**
 * @swagger
 * /slots/{id}:
 *   delete:
 *     summary: Delete slot
 *     tags: [Slots]
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
 *         description: Slot deleted
 */
router.delete('/:id', deleteSlot);

module.exports = router;
