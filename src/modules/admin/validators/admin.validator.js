const { z } = require('zod');
const { USER_STATUS, ROLES } = require('../../../constants');

// Schema for creating an admin
const createAdminSchema = z.object({
  fullName: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  phoneNumber: z.string().min(5).max(20).trim(),
  password: z.string().min(8).max(100),
  role: z.enum([ROLES.FINANCE_ADMIN, ROLES.SUPPORT_ADMIN]),
});

// Schema for updating an admin
const updateAdminSchema = z.object({
  fullName: z.string().min(2).max(100).trim().optional(),
  email: z.string().email().toLowerCase().trim().optional(),
  phoneNumber: z.string().min(5).max(20).trim().optional(),
  role: z.enum([ROLES.FINANCE_ADMIN, ROLES.SUPPORT_ADMIN]).optional(),
});

// Schema for updating admin status
const updateAdminStatusSchema = z.object({
  status: z.enum([USER_STATUS.ACTIVE, USER_STATUS.SUSPENDED, USER_STATUS.DEACTIVATED]),
});

// Schema for resetting admin password
const resetAdminPasswordSchema = z.object({
  newPassword: z.string().min(8).max(100),
});

// Schema for updating own profile
const updateOwnProfileSchema = z.object({
  fullName: z.string().min(2).max(100).trim().optional(),
  phoneNumber: z.string().min(5).max(20).trim().optional(),
});

// Schema for changing own password
const changeOwnPasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8).max(100),
});

// Schema for list/filter query parameters
const listAdminsSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  role: z.enum([ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN, ROLES.SUPPORT_ADMIN]).optional(),
  status: z.nativeEnum(USER_STATUS).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

module.exports = {
  createAdminSchema,
  updateAdminSchema,
  updateAdminStatusSchema,
  resetAdminPasswordSchema,
  updateOwnProfileSchema,
  changeOwnPasswordSchema,
  listAdminsSchema,
};
