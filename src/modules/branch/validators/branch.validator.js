const { z } = require('zod');
const { BRANCH_STATUS } = require('../../../constants');
const { optionalBooleanQuery, booleanBody } = require('../../../utils/zodHelpers');

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
  isMain: booleanBody(false),
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
  isMain: optionalBooleanQuery(),
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
  isMain: optionalBooleanQuery(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const listBusinessBranchesSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  governorateId: z.string().uuid().optional(),
  status: z.nativeEnum(BRANCH_STATUS).optional(),
  city: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const nearbyBranchesSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(200).default(10),
  governorateId: z.string().uuid().optional(),
  businessId: z.string().uuid().optional(),
  status: z.nativeEnum(BRANCH_STATUS).optional(),
  city: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const listByGovernorateSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  status: z.nativeEnum(BRANCH_STATUS).optional(),
  businessId: z.string().uuid().optional(),
  city: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

module.exports = {
  createBranchSchema,
  updateBranchSchema,
  updateBranchStatusSchema,
  listBranchesSchema,
  listBusinessBranchesSchema,
  nearbyBranchesSchema,
  listByGovernorateSchema,
};
