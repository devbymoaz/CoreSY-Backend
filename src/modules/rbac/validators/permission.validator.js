/**
 * Permission Validator
 * Validation schemas for permission operations using Zod
 */

const { z } = require('zod');
const { PERMISSION_STATUS, PERMISSION_MODULES } = require('../../../constants');

// Schema for creating a permission
const createPermissionSchema = z.object({
  module: z.nativeEnum(PERMISSION_MODULES),
  name: z.string().min(2).max(100).trim(),
  slug: z.string().min(3).max(100).trim().refine((val) => val.includes('.'), {
    message: 'Slug must contain a module prefix (e.g., users.create)',
  }),
  description: z.string().max(500).nullable().optional(),
});

// Schema for updating a permission
const updatePermissionSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(500).nullable().optional(),
  status: z.nativeEnum(PERMISSION_STATUS).optional(),
});

// Schema for list/filter query parameters
const listPermissionsSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  module: z.nativeEnum(PERMISSION_MODULES).optional(),
  status: z.nativeEnum(PERMISSION_STATUS).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

module.exports = {
  createPermissionSchema,
  updatePermissionSchema,
  listPermissionsSchema,
};
