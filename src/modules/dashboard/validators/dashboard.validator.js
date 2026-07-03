/**
 * Admin dashboard validators.
 */

const { z } = require('zod');
const { PAYMENT_METHOD_TYPE } = require('../../../constants');

const dashboardQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  businessId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  governorateId: z.string().uuid().optional(),
  paymentMethod: z.nativeEnum(PAYMENT_METHOD_TYPE).optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  q: z.string().optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(50)).optional(),
  section: z
    .enum([
      'overview',
      'financial',
      'bookings',
      'orders',
      'payments',
      'businesses',
      'customers',
      'drivers',
      'products',
    ])
    .optional(),
  format: z.enum(['csv', 'excel', 'xls', 'xlsx', 'pdf']).optional(),
});

module.exports = {
  dashboardQuerySchema,
};
