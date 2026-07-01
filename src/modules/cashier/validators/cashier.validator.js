const { z } = require('zod');
const { CASHIER_STATUS } = require('../../../constants');

const createCashierSchema = z.object({
  fullName: z.string().min(2).max(255).trim(),
  email: z.string().email().trim(),
  phoneNumber: z.string().min(10).max(20).trim(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
      message:
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
    }),
  businessId: z.string().uuid(),
  branchId: z.string().uuid(),
  joiningDate: z.string().optional().nullable(),
});

const updateCashierSchema = z.object({
  fullName: z.string().min(2).max(255).trim().optional(),
  email: z.string().email().trim().optional(),
  phoneNumber: z.string().min(10).max(20).trim().optional(),
  businessId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  joiningDate: z.string().optional().nullable(),
});

const updateCashierStatusSchema = z.object({
  status: z.nativeEnum(CASHIER_STATUS),
});

const resetCashierPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
      message:
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
    }),
});

const changeCashierPasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
      message:
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
    }),
});

const listCashiersSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  businessId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  status: z.nativeEnum(CASHIER_STATUS).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const updateCashierProfileSchema = z.object({
  fullName: z.string().min(2).max(255).trim().optional(),
  phoneNumber: z.string().min(10).max(20).trim().optional(),
});

module.exports = {
  createCashierSchema,
  updateCashierSchema,
  updateCashierStatusSchema,
  resetCashierPasswordSchema,
  changeCashierPasswordSchema,
  listCashiersSchema,
  updateCashierProfileSchema,
};
