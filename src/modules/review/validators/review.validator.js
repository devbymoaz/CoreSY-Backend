/**
 * Review validators.
 */

const { z } = require('zod');
const { REVIEW_STATUS } = require('../../../constants');

const ratingField = z
  .union([z.number().int(), z.string().transform(Number)])
  .refine((val) => !Number.isNaN(val) && val >= 1 && val <= 5);

const optionalRating = ratingField.optional().nullable();

/** Empty string / undefined → null so Flutter can omit orderId for booking reviews */
const optionalUuid = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  z.string().uuid().nullable().optional(),
);

const createReviewSchema = z
  .object({
    bookingId: optionalUuid,
    orderId: optionalUuid,
    businessId: optionalUuid,
    branchId: optionalUuid,
    serviceId: optionalUuid,
    productId: optionalUuid,
    driverId: optionalUuid,
    overallRating: ratingField,
    serviceRating: optionalRating,
    qualityRating: optionalRating,
    cleanlinessRating: optionalRating,
    deliveryRating: optionalRating,
    communicationRating: optionalRating,
    title: z.string().max(200).optional().nullable(),
    description: z.string().max(2000).optional().nullable(),
    images: z
      .array(z.string().url().or(z.string().min(1)))
      .max(10)
      .optional()
      .default([]),
  })
  .refine((data) => Boolean(data.bookingId || data.orderId), {
    message:
      'For Care/Pass booking reviews send bookingId. For Go order reviews send orderId. Do not send empty orderId.',
    path: ['bookingId'],
  });

const updateReviewSchema = z
  .object({
    overallRating: ratingField.optional(),
    serviceRating: optionalRating,
    qualityRating: optionalRating,
    cleanlinessRating: optionalRating,
    deliveryRating: optionalRating,
    communicationRating: optionalRating,
    title: z.string().max(200).optional().nullable(),
    description: z.string().max(2000).optional().nullable(),
    images: z
      .array(z.string().url().or(z.string().min(1)))
      .max(10)
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

const reportReviewSchema = z.object({
  reason: z.string().max(500).optional().nullable(),
});

const reviewImagesSchema = z.object({
  images: z
    .array(z.string().url().or(z.string().min(1)))
    .min(1)
    .max(10),
});

const replyReviewSchema = z.object({
  message: z.string().min(2).max(2000),
});

const updateStatusSchema = z.object({
  reviewId: z.string().uuid(),
  status: z.nativeEnum(REVIEW_STATUS),
});

const listReviewsSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  customerId: z.string().uuid().optional(),
  businessId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  status: z.nativeEnum(REVIEW_STATUS).optional(),
  minRating: z.string().transform(Number).pipe(z.number().min(1).max(5)).optional(),
  maxRating: z.string().transform(Number).pipe(z.number().min(1).max(5)).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'overallRating', 'likesCount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

module.exports = {
  createReviewSchema,
  updateReviewSchema,
  reportReviewSchema,
  reviewImagesSchema,
  replyReviewSchema,
  updateStatusSchema,
  listReviewsSchema,
};
