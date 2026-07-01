const { z } = require('zod');
const { BOOKING_TYPE, BOOKING_STATUS, PAYMENT_STATUS } = require('../../../constants');

const createBookingSchema = z.object({
  slotId: z.string().uuid(),
  numberOfGuests: z.number().int().positive(),
  specialInstructions: z.string().optional(),
  paymentMethod: z.string().optional(),
});

const updateBookingSchema = z.object({
  numberOfGuests: z.number().int().positive().optional(),
  specialInstructions: z.string().optional(),
});

const cancelBookingSchema = z.object({
  cancellationReason: z.string().optional(),
});

const rescheduleBookingSchema = z.object({
  slotId: z.string().uuid(),
});

const listBookingsSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  businessId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  slotId: z.string().uuid().optional(),
  status: z.nativeEnum(BOOKING_STATUS).optional(),
  paymentStatus: z.nativeEnum(PAYMENT_STATUS).optional(),
  bookingType: z.nativeEnum(BOOKING_TYPE).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const addFavoriteSchema = z.object({
  businessId: z.string().uuid(),
});

module.exports = {
  createBookingSchema,
  updateBookingSchema,
  cancelBookingSchema,
  rescheduleBookingSchema,
  listBookingsSchema,
  addFavoriteSchema,
};
