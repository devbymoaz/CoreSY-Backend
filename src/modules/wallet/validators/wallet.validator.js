/**
 * Wallet validators.
 */

const { z } = require('zod');
const {
  WALLET_STATUS,
  WALLET_TRANSACTION_TYPE,
  WALLET_TRANSACTION_STATUS,
} = require('../../../constants');

const amountSchema = z
  .union([z.number(), z.string().transform(Number)])
  .refine((val) => !Number.isNaN(val) && val > 0, { message: 'Amount must be greater than zero' });

const topUpSchema = z.object({
  amount: amountSchema,
  description: z.string().max(255).optional().nullable(),
});

const withdrawSchema = z.object({
  amount: amountSchema,
  description: z.string().max(255).optional().nullable(),
});

const transferSchema = z.object({
  toCustomerId: z.string().uuid(),
  amount: amountSchema,
  description: z.string().max(255).optional().nullable(),
});

const adjustWalletSchema = z.object({
  walletId: z.string().uuid(),
  amount: amountSchema,
  direction: z.enum(['CREDIT', 'DEBIT']),
  reason: z.string().max(500).optional().nullable(),
});

const listWalletsSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  status: z.nativeEnum(WALLET_STATUS).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'currentBalance']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const listTransactionsSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  type: z.nativeEnum(WALLET_TRANSACTION_TYPE).optional(),
  status: z.nativeEnum(WALLET_TRANSACTION_STATUS).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'amount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const walletIdParamSchema = z.object({
  id: z.string().uuid(),
});

module.exports = {
  topUpSchema,
  withdrawSchema,
  transferSchema,
  adjustWalletSchema,
  listWalletsSchema,
  listTransactionsSchema,
  walletIdParamSchema,
};
