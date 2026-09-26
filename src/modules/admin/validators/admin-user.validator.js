/**
 * Admin user management validators.
 */

const { z } = require('zod');
const { USER_STATUS, BAN_TYPE, SUBSCRIPTION_TIERS } = require('../../../constants');

const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  status: z.nativeEnum(USER_STATUS).optional(),
  banType: z.nativeEnum(BAN_TYPE).optional(),
  governorateId: z.string().uuid().optional(),
  role: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'fullName', 'email', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const updateUserSchema = z
  .object({
    fullName: z.string().min(2).max(255).trim().optional(),
    email: z.string().email().optional(),
    phoneNumber: z.string().min(8).max(20).trim().optional(),
    smartAssistantName: z.string().max(100).trim().optional().nullable(),
    profileImage: z.string().url().optional().nullable(),
    governorateId: z.string().uuid().optional(),
    subscription: z.nativeEnum(SUBSCRIPTION_TIERS).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

const banUserSchema = z.object({
  type: z.nativeEnum(BAN_TYPE).default(BAN_TYPE.PERMANENT),
  bannedUntil: z.string().datetime().or(z.string().min(1)).optional().nullable(),
  reason: z.string().max(500).trim().optional().nullable(),
});

const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

module.exports = {
  listUsersSchema,
  updateUserSchema,
  banUserSchema,
  historyQuerySchema,
};
