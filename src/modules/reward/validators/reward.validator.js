const { z } = require('zod');
const { REWARD_STATUS } = require('../../../constants');

const createRewardSchema = z.object({
  name: z.string().min(2).max(255).trim(),
  description: z.string().max(2000).optional().nullable(),
  pointsCost: z.union([z.number().int(), z.string().transform(Number)]).refine((v) => v > 0),
  photo: z.string().optional().nullable(),
  stock: z
    .union([z.number().int(), z.string().transform(Number)])
    .optional()
    .nullable(),
  businessId: z.string().uuid().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
  status: z.nativeEnum(REWARD_STATUS).optional(),
});

const updateRewardSchema = z.object({
  name: z.string().min(2).max(255).trim().optional(),
  description: z.string().max(2000).optional().nullable(),
  pointsCost: z
    .union([z.number().int(), z.string().transform(Number)])
    .refine((v) => v > 0)
    .optional(),
  photo: z.string().optional().nullable(),
  stock: z
    .union([z.number().int(), z.string().transform(Number)])
    .optional()
    .nullable(),
  branchId: z.string().uuid().optional().nullable(),
  status: z.nativeEnum(REWARD_STATUS).optional(),
});

const listRewardsSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  businessId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  status: z.nativeEnum(REWARD_STATUS).optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const redeemRewardSchema = z.object({
  rewardId: z.string().uuid(),
});

module.exports = {
  createRewardSchema,
  updateRewardSchema,
  listRewardsSchema,
  redeemRewardSchema,
};
