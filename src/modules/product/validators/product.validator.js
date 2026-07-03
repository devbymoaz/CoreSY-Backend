/**
 * Product and product category validators.
 * Zod schemas for CoreSY Go product management requests.
 */

const { z } = require('zod');
const { PRODUCT_STATUS, PRODUCT_UNIT } = require('../../../constants');

const positivePrice = z
  .union([z.number(), z.string().transform(Number)])
  .refine((val) => !Number.isNaN(val) && val >= 0, {
    message: 'Price must be a non-negative number',
  });

const optionalPrice = positivePrice.optional().nullable();

const imageUrlSchema = z.string().url('Image must be a valid URL').or(z.string().min(1).max(500));

const createProductBaseSchema = z.object({
  name: z.string().min(2).max(255).trim(),
  sku: z.string().min(2).max(100).trim(),
  description: z.string().max(5000).trim().optional().nullable(),
  businessId: z.string().uuid(),
  branchId: z.string().uuid(),
  categoryId: z.string().uuid(),
  subCategoryId: z.string().uuid().optional().nullable(),
  images: z.array(imageUrlSchema).max(20).optional().default([]),
  basePrice: positivePrice,
  discountPrice: optionalPrice,
  subscriberPrice: optionalPrice,
  stockQuantity: z
    .union([z.number().int(), z.string().transform(Number)])
    .refine((val) => !Number.isNaN(val) && val >= 0, {
      message: 'Stock quantity must be a non-negative integer',
    })
    .optional()
    .default(0),
  unlimitedStock: z.boolean().optional().default(false),
  lowStockThreshold: z
    .union([z.number().int(), z.string().transform(Number)])
    .refine((val) => !Number.isNaN(val) && val >= 0)
    .optional()
    .default(10),
  preparationTime: z
    .union([z.number().int(), z.string().transform(Number)])
    .refine((val) => val === null || val === undefined || (!Number.isNaN(val) && val >= 0))
    .optional()
    .nullable(),
  unit: z.nativeEnum(PRODUCT_UNIT).optional().default(PRODUCT_UNIT.PIECE),
  weight: z
    .union([z.number(), z.string().transform(Number)])
    .refine((val) => val === null || val === undefined || (!Number.isNaN(val) && val >= 0))
    .optional()
    .nullable(),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).optional().default([]),
  barcode: z.string().trim().max(100).optional().nullable(),
  status: z.nativeEnum(PRODUCT_STATUS).optional().default(PRODUCT_STATUS.ACTIVE),
  isFeatured: z.boolean().optional().default(false),
  isRecommended: z.boolean().optional().default(false),
});

const createProductSchema = createProductBaseSchema.superRefine((data, ctx) => {
  if (data.discountPrice != null && data.discountPrice > data.basePrice) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discountPrice'],
      message: 'Discount price cannot be greater than base price',
    });
  }
  if (!data.unlimitedStock && data.stockQuantity < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['stockQuantity'],
      message: 'Stock quantity must be non-negative',
    });
  }
});

const updateProductSchema = z
  .object({
    name: z.string().min(2).max(255).trim().optional(),
    sku: z.string().min(2).max(100).trim().optional(),
    description: z.string().max(5000).trim().optional().nullable(),
    categoryId: z.string().uuid().optional(),
    subCategoryId: z.string().uuid().optional().nullable(),
    images: z.array(imageUrlSchema).max(20).optional(),
    basePrice: positivePrice.optional(),
    discountPrice: optionalPrice,
    subscriberPrice: optionalPrice,
    stockQuantity: z
      .union([z.number().int(), z.string().transform(Number)])
      .refine((val) => !Number.isNaN(val) && val >= 0)
      .optional(),
    unlimitedStock: z.boolean().optional(),
    lowStockThreshold: z
      .union([z.number().int(), z.string().transform(Number)])
      .refine((val) => !Number.isNaN(val) && val >= 0)
      .optional(),
    preparationTime: z
      .union([z.number().int(), z.string().transform(Number)])
      .optional()
      .nullable(),
    unit: z.nativeEnum(PRODUCT_UNIT).optional(),
    weight: z
      .union([z.number(), z.string().transform(Number)])
      .optional()
      .nullable(),
    tags: z.array(z.string().trim().min(1).max(50)).max(30).optional(),
    barcode: z.string().trim().max(100).optional().nullable(),
    isFeatured: z.boolean().optional(),
    isRecommended: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

const updateProductStatusSchema = z.object({
  status: z.nativeEnum(PRODUCT_STATUS).refine((status) => status !== PRODUCT_STATUS.DELETED, {
    message: 'Use delete endpoint to remove products',
  }),
});

const updateProductStockSchema = z.object({
  stockQuantity: z
    .union([z.number().int(), z.string().transform(Number)])
    .refine((val) => !Number.isNaN(val) && val >= 0, {
      message: 'Stock quantity must be a non-negative integer',
    }),
  unlimitedStock: z.boolean().optional(),
  reason: z.string().trim().max(255).optional().nullable(),
});

const uploadProductImagesSchema = z.object({
  images: z.array(imageUrlSchema).min(1).max(20),
});

const removeProductImagesSchema = z.object({
  images: z.array(z.string().min(1)).min(1).max(20),
});

const listProductsSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  businessId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  subCategoryId: z.string().uuid().optional(),
  status: z.nativeEnum(PRODUCT_STATUS).optional(),
  minPrice: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  maxPrice: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  availability: z.enum(['in_stock', 'out_of_stock', 'low_stock']).optional(),
  isFeatured: z
    .any()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : val))
    .pipe(z.boolean().optional()),
  isRecommended: z
    .any()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : val))
    .pipe(z.boolean().optional()),
  barcode: z.string().optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'name', 'basePrice', 'stockQuantity', 'status'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const bulkUpdateProductsSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(100),
  data: z
    .object({
      status: z.nativeEnum(PRODUCT_STATUS).optional(),
      isFeatured: z.boolean().optional(),
      isRecommended: z.boolean().optional(),
      categoryId: z.string().uuid().optional(),
      branchId: z.string().uuid().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one update field is required',
    }),
});

const importProductsSchema = z.object({
  products: z
    .array(
      createProductBaseSchema.omit({ images: true }).extend({
        images: z.array(imageUrlSchema).max(20).optional().default([]),
      }),
    )
    .min(1)
    .max(200),
});

const createCategorySchema = z.object({
  name: z.string().min(2).max(255).trim(),
  nameAr: z.string().min(2).max(255).trim().optional().nullable(),
  slug: z
    .string()
    .min(2)
    .max(255)
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase and hyphen-separated')
    .optional(),
  description: z.string().max(2000).trim().optional().nullable(),
  image: imageUrlSchema.optional().nullable(),
  sortOrder: z
    .union([z.number().int(), z.string().transform(Number)])
    .refine((val) => !Number.isNaN(val) && val >= 0)
    .optional()
    .default(0),
  isActive: z.boolean().optional().default(true),
  businessId: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
});

const updateCategorySchema = createCategorySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

const listCategoriesSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  businessId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional().nullable(),
  isActive: z
    .any()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : val))
    .pipe(z.boolean().optional()),
  mainOnly: z
    .any()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : val))
    .pipe(z.boolean().optional()),
  sortBy: z.enum(['sortOrder', 'name', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  updateProductStatusSchema,
  updateProductStockSchema,
  uploadProductImagesSchema,
  removeProductImagesSchema,
  listProductsSchema,
  bulkUpdateProductsSchema,
  importProductsSchema,
  createCategorySchema,
  updateCategorySchema,
  listCategoriesSchema,
};
