/**
 * Report validators.
 */

const { z } = require('zod');

const reportQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  businessId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  governorateId: z.string().uuid().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  type: z
    .enum([
      'dashboard',
      'revenue',
      'bookings',
      'orders',
      'payments',
      'wallet',
      'drivers',
      'customers',
      'businesses',
    ])
    .optional(),
  format: z.enum(['csv', 'excel', 'xls', 'xlsx', 'pdf']).optional(),
});

module.exports = {
  reportQuerySchema,
};
