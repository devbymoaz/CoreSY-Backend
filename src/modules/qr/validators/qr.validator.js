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

module.exports = {
  scanQRSchema,
  validateQRSchema,
  listQRsSchema,
};
