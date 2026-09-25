/**
 * Order validators.
 * Zod schemas for CoreSY Go multi-vendor order requests.
 */

const { z } = require('zod');
const {
  ORDER_STATUS,
  ORDER_PAYMENT_METHOD,
  ORDER_FULFILLMENT_TYPE,
  PAYMENT_STATUS,
} = require('../../../constants');

const deliveryAddressSchema = z.object({
  customerName: z.string().min(2).max(255).trim(),
  phone: z.string().min(8).max(20).trim(),
  governorateId: z.string().uuid(),
  area: z.string().min(2).max(255).trim(),
  street: z.string().min(2).max(255).trim(),
  building: z.string().max(100).trim().optional().nullable(),
  floor: z.string().max(50).trim().optional().nullable(),
  apartment: z.string().max(50).trim().optional().nullable(),
  latitude: z
    .union([z.number(), z.string().transform(Number)])
    .optional()
    .nullable(),
  longitude: z
    .union([z.number(), z.string().transform(Number)])
    .optional()
    .nullable(),
  deliveryNotes: z.string().max(1000).trim().optional().nullable(),
});

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z
    .union([z.number().int(), z.string().transform(Number)])
    .refine((val) => !Number.isNaN(val) && val >= 1, {
      message: 'Quantity must be at least 1',
    }),
});

const createOrderSchema = z
  .object({
    customerId: z.string().uuid().optional(),
    fulfillmentType: z
      .nativeEnum(ORDER_FULFILLMENT_TYPE)
      .optional()
      .default(ORDER_FULFILLMENT_TYPE.DELIVERY),
    paymentMethod: z.nativeEnum(ORDER_PAYMENT_METHOD).default(ORDER_PAYMENT_METHOD.CASH),
    deliveryFee: z
      .union([z.number(), z.string().transform(Number)])
      .refine((val) => val === undefined || (!Number.isNaN(val) && val >= 0))
      .optional(),
    deliveryNotes: z.string().max(1000).trim().optional().nullable(),
    pickupNotes: z.string().max(1000).trim().optional().nullable(),
    deliveryAddress: deliveryAddressSchema.optional().nullable(),
    items: z.array(orderItemSchema).min(1).max(100),
  })
  .superRefine((data, ctx) => {
    const type = data.fulfillmentType || ORDER_FULFILLMENT_TYPE.DELIVERY;
    if (type === ORDER_FULFILLMENT_TYPE.DELIVERY && !data.deliveryAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'deliveryAddress is required when fulfillmentType is DELIVERY',
        path: ['deliveryAddress'],
      });
    }
  });

const cancelOrderSchema = z.object({
  reason: z.string().max(500).trim().optional().nullable(),
});

const rejectOrderSchema = z.object({
  reason: z.string().max(500).trim().optional().nullable(),
});

const listOrdersSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  customerId: z.string().uuid().optional(),
  businessId: z.string().uuid().optional(),
  status: z.nativeEnum(ORDER_STATUS).optional(),
  fulfillmentType: z.nativeEnum(ORDER_FULFILLMENT_TYPE).optional(),
  paymentStatus: z.nativeEnum(PAYMENT_STATUS).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'grandTotal', 'status', 'orderNumber']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const listBusinessOrdersSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  businessId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  status: z.nativeEnum(ORDER_STATUS).optional(),
  fulfillmentType: z.nativeEnum(ORDER_FULFILLMENT_TYPE).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'total', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

module.exports = {
  createOrderSchema,
  cancelOrderSchema,
  rejectOrderSchema,
  listOrdersSchema,
  listBusinessOrdersSchema,
};
