/**
 * Points validators.
 */

const { z } = require('zod');
const {
  LOYALTY_TIER,
  POINT_TRANSACTION_TYPE,
  POINT_TRANSACTION_STATUS,
  POINT_RULE_TYPE,
} = require('../../../constants');

const redeemSchema = z.object({
  points: z
    .union([z.number().int(), z.string().transform(Number)])
    .refine((val) => !Number.isNaN(val) && val > 0),
  description: z.string().max(255).optional().nullable(),
});

const adjustSchema = z.object({
  customerId: z.string().uuid(),
  points: z
    .union([z.number().int(), z.string().transform(Number)])
    .refine((val) => !Number.isNaN(val) && val > 0),
  direction: z.enum(['CREDIT', 'DEBIT']).default('CREDIT'),
  bonusType: z.enum(['BIRTHDAY', 'REFERRAL', 'CAMPAIGN']).optional().nullable(),
  reason: z.string().max(500).optional().nullable(),
});

const updateRulesSchema = z.object({
  rules: z
    .array(
      z.object({
        type: z.nativeEnum(POINT_RULE_TYPE),
        name: z.string().min(2).max(100),
        points: z.number().int().min(0),
        minAmount: z.number().min(0).optional().nullable(),
        isActive: z.boolean().optional(),
        description: z.string().max(500).optional().nullable(),
      }),
    )
    .min(1),
});

const listAccountsSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  tier: z.nativeEnum(LOYALTY_TIER).optional(),
  sortBy: z.enum(['lifetimePoints', 'availablePoints', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const listHistorySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  type: z.nativeEnum(POINT_TRANSACTION_TYPE).optional(),
  status: z.nativeEnum(POINT_TRANSACTION_STATUS).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

module.exports = {
  redeemSchema,
  adjustSchema,
  updateRulesSchema,
  listAccountsSchema,
  listHistorySchema,
};
