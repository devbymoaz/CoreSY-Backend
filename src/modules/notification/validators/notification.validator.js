/**
 * Notification validators.
 */

const { z } = require('zod');
const {
  NOTIFICATION_CHANNEL,
  NOTIFICATION_PRIORITY,
  NOTIFICATION_DELIVERY_STATUS,
} = require('../../../constants');

const listNotificationsSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  channel: z.nativeEnum(NOTIFICATION_CHANNEL).optional(),
  priority: z.nativeEnum(NOTIFICATION_PRIORITY).optional(),
  deliveryStatus: z.nativeEnum(NOTIFICATION_DELIVERY_STATUS).optional(),
  module: z.string().optional(),
  type: z.string().optional(),
  isRead: z
    .any()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : val))
    .pipe(z.boolean().optional()),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'priority', 'deliveryStatus']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const markReadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

const broadcastSchema = z.object({
  title: z.string().min(2).max(200),
  message: z.string().min(2).max(2000),
  type: z.string().max(100).optional(),
  channel: z.nativeEnum(NOTIFICATION_CHANNEL).optional(),
  channels: z.array(z.nativeEnum(NOTIFICATION_CHANNEL)).optional(),
  priority: z.nativeEnum(NOTIFICATION_PRIORITY).optional(),
  module: z.string().max(100).optional(),
  referenceId: z.string().max(100).optional().nullable(),
  userIds: z.array(z.string().uuid()).optional(),
  role: z.string().optional(),
  allUsers: z.boolean().optional(),
  data: z.record(z.string(), z.any()).optional().nullable(),
});

module.exports = {
  listNotificationsSchema,
  markReadSchema,
  broadcastSchema,
};
