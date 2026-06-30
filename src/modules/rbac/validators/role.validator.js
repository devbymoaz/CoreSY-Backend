/**
 * Role Validator
 * Validation schemas for role operations using Zod
 */

const { z } = require('zod');
const { ROLE_STATUS, ROLE_PRIORITIES } = require('../../../constants');

// Schema for creating a role
const createRoleSchema = z.object({
  name: z.string().min(2).max(100).toUpperCase().trim(),
  displayName: z.string().min(2).max(100).trim(),
  description: z.string().max(500).nullable().optional(),
  priority: z.number().int().min(1).max(ROLE_PRIORITIES.SUPER_ADMIN).optional(),
  isSystem: z.boolean().optional().default(false),
});

// Schema for updating a role
const updateRoleSchema = z.object({
  displayName: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(500).nullable().optional(),
  priority: z.number().int().min(1).max(ROLE_PRIORITIES.SUPER_ADMIN).optional(),
  status: z.nativeEnum(ROLE_STATUS).optional(),
});

// Schema for updating role status
const updateRoleStatusSchema = z.object({
  status: z.nativeEnum(ROLE_STATUS),
});

// Schema for assigning permissions to a role
const assignPermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()).min(1),
});

// Schema for list/filter query parameters
const listRolesSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  status: z.nativeEnum(ROLE_STATUS).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

module.exports = {
  createRoleSchema,
  updateRoleSchema,
  updateRoleStatusSchema,
  assignPermissionsSchema,
  listRolesSchema,
};
