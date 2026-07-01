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
 *             required: [newDate]
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
 *             required: [status]
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
