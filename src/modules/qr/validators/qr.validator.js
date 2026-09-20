const { z } = require('zod');
const { QR_STATUS } = require('../../../constants');

const scanQRSchema = z.object({
  token: z.string(),
});

const validateQRSchema = z.object({
  token: z.string(),
});

const listQRsSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  customerId: z.string().uuid().optional(),
  businessId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  cashierId: z.string().uuid().optional(),
  status: z.nativeEnum(QR_STATUS).optional(),
  bookingDateFrom: z.string().optional(),
  bookingDateTo: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const bookingPricingSchema = z.object({
  token: z.string().min(1),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
});

const createPaymentQRSchema = z.object({
  businessId: z.string().uuid(),
  branchId: z.string().uuid().optional().nullable(),
  bookingId: z.string().uuid().optional().nullable(),
  title: z.string().max(255).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  amount: z.coerce.number().positive(),
  discountPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  discountAmount: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().max(10).optional(),
  expiresInMinutes: z.coerce.number().int().positive().max(10080).optional(),
});

const payPaymentQRSchema = z.object({
  password: z.string().min(1),
});

const listPaymentQRsSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  businessId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  status: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

module.exports = {
  scanQRSchema,
  validateQRSchema,
  listQRsSchema,
  bookingPricingSchema,
  createPaymentQRSchema,
  payPaymentQRSchema,
  listPaymentQRsSchema,
};
