const { z } = require('zod');
const { BRANCH_STATUS } = require('../../../constants');

const createBranchSchema = z.object({
  name: z.string().min(2).max(255).trim(),
  businessId: z.string().uuid(),
  type: z.string().min(2).max(100).trim(),
  description: z.string().optional().nullable(),
  governorateId: z.string().uuid(),
  city: z.string().min(2).max(100).trim(),
  address: z.string().min(5).trim(),
  latitude: z.number().or(z.string().transform(Number)).optional().nullable(),
  longitude: z.number().or(z.string().transform(Number)).optional().nullable(),
  googleMapLink: z.string().url().optional().nullable(),
  contactEmail: z.string().email().toLowerCase().trim().optional().nullable(),
  contactPhone: z.string().min(5).max(20).trim().optional().nullable(),
  whatsAppNumber: z.string().min(5).max(20).trim().optional().nullable(),
  workingDays: z.any().optional().nullable(),
  openingTime: z.string().optional().nullable(),
  closingTime: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  isMain: z.boolean().optional().default(false),
});

const updateBranchSchema = z.object({
  name: z.string().min(2).max(255).trim().optional(),
  type: z.string().min(2).max(100).trim().optional(),
  description: z.string().optional().nullable(),
  governorateId: z.string().uuid().optional(),
  city: z.string().min(2).max(100).trim().optional(),
  address: z.string().min(5).trim().optional(),
  latitude: z.number().or(z.string().transform(Number)).optional().nullable(),
  longitude: z.number().or(z.string().transform(Number)).optional().nullable(),
  googleMapLink: z.string().url().optional().nullable(),
  contactEmail: z.string().email().toLowerCase().trim().optional().nullable(),
  contactPhone: z.string().min(5).max(20).trim().optional().nullable(),
  whatsAppNumber: z.string().min(5).max(20).trim().optional().nullable(),
  workingDays: z.any().optional().nullable(),
  openingTime: z.string().optional().nullable(),
  closingTime: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
});

const updateBranchStatusSchema = z.object({
  status: z.nativeEnum(BRANCH_STATUS),
});

const listBranchesSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  businessId: z.string().uuid().optional(),
  status: z.nativeEnum(BRANCH_STATUS).optional(),
  governorateId: z.string().uuid().optional(),
  city: z.string().optional(),
  isMain: z
    .any()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : val))
    .pipe(z.boolean().optional()),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

module.exports = {
  createBranchSchema,
  updateBranchSchema,
  updateBranchStatusSchema,
  listBranchesSchema,
};
