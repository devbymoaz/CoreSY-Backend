const { z } = require('zod');
const { SERVICE_TYPE, SERVICE_CATEGORY, SERVICE_STATUS } = require('../../../constants');

const createServiceSchema = z.object({
  name: z.string().min(2).max(255).trim(),
  businessId: z.string().uuid(),
  branchId: z.string().uuid(),
  category: z.nativeEnum(SERVICE_CATEGORY),
  type: z.nativeEnum(SERVICE_TYPE),
  description: z.string().min(10).trim(),
  shortDescription: z.string().trim().optional().nullable(),
  price: z.union([z.number(), z.string().transform(Number)]).refine((val) => val >= 0, {
    message: 'Price must be a non-negative number',
  }),
  discountPercentage: z
    .union([z.number(), z.string().transform(Number)])
    .optional()
    .nullable()
    .refine((val) => val === null || val === undefined || (val >= 0 && val <= 100), {
      message: 'Discount percentage must be between 0 and 100',
    }),
  coresyDiscount: z
    .union([z.number(), z.string().transform(Number)])
    .optional()
    .nullable()
    .refine((val) => val === null || val === undefined || (val >= 0 && val <= 100), {
      message: 'CoreSY discount must be between 0 and 100',
    }),
  platformFee: z
    .union([z.number(), z.string().transform(Number)])
    .optional()
    .nullable()
    .refine((val) => val === null || val === undefined || val >= 0, {
      message: 'Platform fee must be a non-negative number',
    }),
  duration: z.number().int().min(1).optional().nullable(),
  maxCapacity: z.number().int().min(1).optional().nullable(),
  bookingRequired: z.boolean().optional().default(false),
  appointmentRequired: z.boolean().optional().default(false),
  deliveryAvailable: z.boolean().optional().default(false),
});

const updateServiceSchema = z.object({
  name: z.string().min(2).max(255).trim().optional(),
  category: z.nativeEnum(SERVICE_CATEGORY).optional(),
  type: z.nativeEnum(SERVICE_TYPE).optional(),
  description: z.string().min(10).trim().optional(),
  shortDescription: z.string().trim().optional().nullable(),
  price: z
    .union([z.number(), z.string().transform(Number)])
    .refine((val) => val >= 0, {
      message: 'Price must be a non-negative number',
    })
    .optional(),
  discountPercentage: z
    .union([z.number(), z.string().transform(Number)])
    .optional()
    .nullable()
    .refine((val) => val === null || val === undefined || (val >= 0 && val <= 100), {
      message: 'Discount percentage must be between 0 and 100',
    }),
  coresyDiscount: z
    .union([z.number(), z.string().transform(Number)])
    .optional()
    .nullable()
    .refine((val) => val === null || val === undefined || (val >= 0 && val <= 100), {
      message: 'CoreSY discount must be between 0 and 100',
    }),
  platformFee: z
    .union([z.number(), z.string().transform(Number)])
    .optional()
    .nullable()
    .refine((val) => val === null || val === undefined || val >= 0, {
      message: 'Platform fee must be a non-negative number',
    }),
  duration: z.number().int().min(1).optional().nullable(),
  maxCapacity: z.number().int().min(1).optional().nullable(),
  bookingRequired: z.boolean().optional(),
  appointmentRequired: z.boolean().optional(),
  deliveryAvailable: z.boolean().optional(),
});

const updateServiceStatusSchema = z.object({
  status: z.nativeEnum(SERVICE_STATUS),
});

const listServicesSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  businessId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  category: z.nativeEnum(SERVICE_CATEGORY).optional(),
  type: z.nativeEnum(SERVICE_TYPE).optional(),
  status: z.nativeEnum(SERVICE_STATUS).optional(),
  isFeatured: z
    .any()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : val))
    .pipe(z.boolean().optional()),
  minPrice: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  maxPrice: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

module.exports = {
  createServiceSchema,
  updateServiceSchema,
  updateServiceStatusSchema,
  listServicesSchema,
};
