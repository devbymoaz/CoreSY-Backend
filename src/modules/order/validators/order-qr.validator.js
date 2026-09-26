/**
 * Order QR validators.
 */

const { z } = require('zod');
const { ORDER_PAYMENT_METHOD } = require('../../../constants');

const scanOrderQRSchema = z.object({
  token: z.string().min(16).max(128),
});

const payOrderQRSchema = z.object({
  paymentMethod: z.enum([ORDER_PAYMENT_METHOD.CASH, ORDER_PAYMENT_METHOD.WALLET]),
  password: z.string().min(1).max(100).optional(),
});

module.exports = {
  scanOrderQRSchema,
  payOrderQRSchema,
};
