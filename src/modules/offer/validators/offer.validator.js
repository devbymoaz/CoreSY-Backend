const { z } = require('zod');
const { OFFER_STATUS } = require('../../../constants');

const money = z.union([z.number(), z.string().transform(Number)]).refine((v) => v >= 0);

const createOfferSchema = z.object({
  name: z.string().min(2).max(255).trim(),
  description: z.string().max(2000).optional().nullable(),
  actualPrice: money,
  offPrice: money,
  startDate: z.string(),
  endDate: z.string(),
  photo: z.string().optional().nullable(),
  businessId: z.string().uuid(),
  branchId: z.string().uuid().optional().nullable(),
  status: z.nativeEnum(OFFER_STATUS).optional(),
});

const updateOfferSchema = z.object({
  name: z.string().min(2).max(255).trim().optional(),
  description: z.string().max(2000).optional().nullable(),
  actualPrice: money.optional(),
  offPrice: money.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  photo: z.string().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
  status: z.nativeEnum(OFFER_STATUS).optional(),
});

const listOffersSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  businessId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  status: z.nativeEnum(OFFER_STATUS).optional(),
  activeOnly: z
    .union([z.boolean(), z.string().transform((v) => v === 'true' || v === '1')])
    .optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

module.exports = {
  createOfferSchema,
  updateOfferSchema,
  listOffersSchema,
};
