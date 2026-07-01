const { z } = require('zod');
const { BUSINESS_TYPE, BUSINESS_STATUS } = require('../../../constants');

const createBusinessSchema = z.object({
  name: z.string().min(2).max(255).trim(),
  type: z.nativeEnum(BUSINESS_TYPE),
  category: z.string().min(2).max(100).trim(),
  description: z.string().min(10).trim(),
  ownerName: z.string().min(2).max(255).trim(),
  ownerEmail: z.string().email().toLowerCase().trim(),
  ownerPhone: z.string().min(5).max(20).trim(),
  businessEmail: z.string().email().toLowerCase().trim(),
  businessPhone: z.string().min(5).max(20).trim(),
  registrationNumber: z.string().min(2).max(100).trim(),
  taxNumber: z.string().min(2).max(100).optional().nullable(),
  website: z.string().url().optional().nullable(),
  governorateId: z.string().uuid(),
  city: z.string().min(2).max(100).trim(),
  address: z.string().min(5).trim(),
  latitude: z.number().or(z.string().transform(Number)).optional().nullable(),
  longitude: z.number().or(z.string().transform(Number)).optional().nullable(),
  workingHours: z.any().optional().nullable(),
  facebook: z.string().url().optional().nullable(),
  instagram: z.string().url().optional().nullable(),
  whatsApp: z.string().min(5).max(20).optional().nullable(),
});

const updateBusinessSchema = z.object({
  name: z.string().min(2).max(255).trim().optional(),
  type: z.nativeEnum(BUSINESS_TYPE).optional(),
  category: z.string().min(2).max(100).trim().optional(),
  description: z.string().min(10).trim().optional(),
  ownerName: z.string().min(2).max(255).trim().optional(),
  ownerEmail: z.string().email().toLowerCase().trim().optional(),
  ownerPhone: z.string().min(5).max(20).trim().optional(),
  businessEmail: z.string().email().toLowerCase().trim().optional(),
  businessPhone: z.string().min(5).max(20).trim().optional(),
  registrationNumber: z.string().min(2).max(100).trim().optional(),
  taxNumber: z.string().min(2).max(100).optional().nullable(),
  website: z.string().url().optional().nullable(),
  governorateId: z.string().uuid().optional(),
  city: z.string().min(2).max(100).trim().optional(),
  address: z.string().min(5).trim().optional(),
  latitude: z.number().or(z.string().transform(Number)).optional().nullable(),
  longitude: z.number().or(z.string().transform(Number)).optional().nullable(),
  workingHours: z.any().optional().nullable(),
  facebook: z.string().url().optional().nullable(),
  instagram: z.string().url().optional().nullable(),
  whatsApp: z.string().min(5).max(20).optional().nullable(),
});

const updateBusinessStatusSchema = z.object({
  status: z.nativeEnum(BUSINESS_STATUS),
});

const listBusinessesSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  type: z.nativeEnum(BUSINESS_TYPE).optional(),
  status: z.nativeEnum(BUSINESS_STATUS).optional(),
  governorateId: z.string().uuid().optional(),
  category: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

module.exports = {
  createBusinessSchema,
  updateBusinessSchema,
  updateBusinessStatusSchema,
  listBusinessesSchema,
};
