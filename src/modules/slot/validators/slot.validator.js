const { z } = require('zod');
const {
  SLOT_STATUS,
  BOOKING_TYPE,
  RECURRING_TYPE,
  GENDER_RESTRICTION,
} = require('../../../constants');

const createSlotSchema = z.object({
  serviceId: z.string().uuid(),
  businessId: z.string().uuid(),
  branchId: z.string().uuid(),
  slotDate: z.string(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  duration: z.number().int().positive(),
  maxCapacity: z.number().int().positive(),
  bookingType: z.nativeEnum(BOOKING_TYPE),
  genderRestriction: z.nativeEnum(GENDER_RESTRICTION).optional(),
  minAge: z.number().int().positive().optional(),
  maxAge: z.number().int().positive().optional(),
  isRecurring: z.boolean().optional(),
  recurringType: z.nativeEnum(RECURRING_TYPE).optional(),
  recurringEndDate: z.string().optional(),
});

const updateSlotSchema = z.object({
  slotDate: z.string().optional(),
  startTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  endTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  duration: z.number().int().positive().optional(),
  maxCapacity: z.number().int().positive().optional(),
  bookingType: z.nativeEnum(BOOKING_TYPE).optional(),
  genderRestriction: z.nativeEnum(GENDER_RESTRICTION).optional(),
  minAge: z.number().int().positive().optional(),
  maxAge: z.number().int().positive().optional(),
  isRecurring: z.boolean().optional(),
  recurringType: z.nativeEnum(RECURRING_TYPE).optional(),
  recurringEndDate: z.string().optional(),
});

const updateSlotStatusSchema = z.object({
  status: z.nativeEnum(SLOT_STATUS),
});

const listSlotsSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  businessId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  status: z.nativeEnum(SLOT_STATUS).optional(),
  bookingType: z.nativeEnum(BOOKING_TYPE).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const createRecurringSlotsSchema = z.object({
  serviceId: z.string().uuid(),
  businessId: z.string().uuid(),
  branchId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
  daysOfWeek: z.array(z.number().min(0).max(6)),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  duration: z.number().int().positive(),
  maxCapacity: z.number().int().positive(),
  bookingType: z.nativeEnum(BOOKING_TYPE),
  genderRestriction: z.nativeEnum(GENDER_RESTRICTION).optional(),
  minAge: z.number().int().positive().optional(),
  maxAge: z.number().int().positive().optional(),
});

const duplicateSlotSchema = z.object({
  newDate: z.string(),
});

module.exports = {
  createSlotSchema,
  updateSlotSchema,
  updateSlotStatusSchema,
  listSlotsSchema,
  createRecurringSlotsSchema,
  duplicateSlotSchema,
};
