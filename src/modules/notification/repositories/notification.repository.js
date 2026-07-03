/**
 * Notification repository.
 */

const { prisma } = require('../../../prisma');
const { PAGINATION, NOTIFICATION_DELIVERY_STATUS } = require('../../../constants');

class NotificationRepository {
  async create(data) {
    return prisma.notification.create({ data });
  }

  async createMany(data) {
    return prisma.notification.createMany({ data });
  }

  async findById(id) {
    return prisma.notification.findUnique({ where: { id } });
  }

  async findAll({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    userId,
    search,
    channel,
    priority,
    deliveryStatus,
    module,
    type,
    isRead,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) {
    const skip = (page - 1) * limit;
    const where = {};

    if (userId) where.userId = userId;
    if (channel) where.channel = channel;
    if (priority) where.priority = priority;
    if (deliveryStatus) where.deliveryStatus = deliveryStatus;
    if (module) where.module = module;
    if (type) where.type = type;
    if (typeof isRead === 'boolean') where.isRead = isRead;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { notificationId: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
        { referenceId: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async update(id, data) {
    return prisma.notification.update({ where: { id }, data });
  }

  async updateMany(where, data) {
    return prisma.notification.updateMany({ where, data });
  }

  async delete(id) {
    return prisma.notification.delete({ where: { id } });
  }

  async findFailed(limit = 100) {
    return prisma.notification.findMany({
      where: { deliveryStatus: NOTIFICATION_DELIVERY_STATUS.FAILED },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
  }

  async getDashboard(userId = null) {
    const where = userId ? { userId } : {};
    const [total, unread, failed, delivered] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, isRead: false } }),
      prisma.notification.count({
        where: { ...where, deliveryStatus: NOTIFICATION_DELIVERY_STATUS.FAILED },
      }),
      prisma.notification.count({
        where: {
          ...where,
          deliveryStatus: {
            in: [NOTIFICATION_DELIVERY_STATUS.DELIVERED, NOTIFICATION_DELIVERY_STATUS.READ],
          },
        },
      }),
    ]);

    return { totalNotifications: total, unread, failed, delivered };
  }
}

module.exports = new NotificationRepository();
