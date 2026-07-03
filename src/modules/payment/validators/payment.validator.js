/**
 * Payment validators.
 */

const { z } = require('zod');
const { PAYMENT_METHOD_TYPE, PAYMENT_RECORD_STATUS, PAYMENT_TYPE } = require('../../../constants');

const nonNegative = z
  .union([z.number(), z.string().transform(Number)])
  .refine((val) => !Number.isNaN(val) && val >= 0);

const createPaymentSchema = z
  .object({
    customerId: z.string().uuid().optional(),
    bookingId: z.string().uuid().optional().nullable(),
    orderId: z.string().uuid().optional().nullable(),
    businessId: z.string().uuid().optional().nullable(),
    branchId: z.string().uuid().optional().nullable(),
    paymentMethod: z.nativeEnum(PAYMENT_METHOD_TYPE),
    paymentType: z.nativeEnum(PAYMENT_TYPE).optional(),
    subtotal: nonNegative.optional(),
    discount: nonNegative.optional(),
    subscriberDiscount: nonNegative.optional(),
    platformFee: nonNegative.optional(),
    deliveryFee: nonNegative.optional(),
    tax: nonNegative.optional(),
    grandTotal: nonNegative.optional(),
    currency: z.string().length(3).optional(),
    gatewayReference: z.string().max(255).optional().nullable(),
  })
  .refine(
    (data) => data.bookingId || data.orderId || data.subtotal != null || data.grandTotal != null,
    {
      message: 'bookingId, orderId, or amount fields are required',
    },
  );

const refundPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  amount: nonNegative.optional(),
  reason: z.string().max(500).optional().nullable(),
});

const cancelPaymentSchema = z.object({
  reason: z.string().max(500).optional().nullable(),
});

const listPaymentsSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  customerId: z.string().uuid().optional(),
  businessId: z.string().uuid().optional(),
  status: z.nativeEnum(PAYMENT_RECORD_STATUS).optional(),
  paymentMethod: z.nativeEnum(PAYMENT_METHOD_TYPE).optional(),
  minAmount: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  maxAmount: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'transactionDate', 'grandTotal', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

module.exports = {
  createPaymentSchema,
  refundPaymentSchema,
  cancelPaymentSchema,
  listPaymentsSchema,
};
