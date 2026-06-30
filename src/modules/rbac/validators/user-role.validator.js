/**
 * User Role Validator
 * Validation schemas for user role operations using Zod
 */

const { z } = require('zod');

// Schema for assigning roles to a user
const assignRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()).min(1),
});

module.exports = {
  assignRolesSchema,
};
