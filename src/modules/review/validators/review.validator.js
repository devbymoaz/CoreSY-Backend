/**
 * Review validators.
 */

const { z } = require('zod');
const { REVIEW_STATUS } = require('../../../constants');

const ratingField = z
  .union([z.number().int(), z.string().transform(Number)])
  .refine((val) => !Number.isNaN(val) && val >= 1 && val <= 5);

const optionalRating = ratingField.optional().nullable();

const createReviewSchema = z
  .object({
    bookingId: z.string().uuid().optional().nullable(),
    orderId: z.string().uuid().optional().nullable(),
    businessId: z.string().uuid().optional().nullable(),
    branchId: z.string().uuid().optional().nullable(),
    serviceId: z.string().uuid().optional().nullable(),
    productId: z.string().uuid().optional().nullable(),
    driverId: z.string().uuid().optional().nullable(),
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
  .refine((data) => data.bookingId || data.orderId, {
    message: 'bookingId or orderId is required',
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
