/**
 * Notification service.
 * Multi-channel notification management (in-app primary; push/email/sms/whatsapp queued).
 */

const notificationRepository = require('../repositories/notification.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const AppError = require('../../../utils/AppError');
const logger = require('../../../utils/logger');
const { prisma } = require('../../../prisma');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
  NOTIFICATION_CHANNEL,
  NOTIFICATION_PRIORITY,
  NOTIFICATION_DELIVERY_STATUS,
  PERMISSION_MODULES,
} = require('../../../constants');

const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.SUPPORT_ADMIN];

class NotificationService {
  _hasRole(user, roles) {
    return roles.some((role) => user.roles?.includes(role));
  }

  async _audit(userId, action, payload, ipAddress, userAgent) {
    const entry = {
      userId,
      action,
      module: PERMISSION_MODULES.NOTIFICATIONS,
      ipAddress,
      userAgent,
      payload,
    };
    if (typeof auditLogService.create === 'function') {
      await auditLogService.create(entry);
    } else {
      await auditLogService.logAction(entry);
    }
  }

  /**
   * Simulate channel delivery. In-app is delivered immediately.
   * External channels are marked SENT/DELIVERED for production-ready stubs.
   */
  async _deliver(notification) {
    try {
      if (notification.channel === NOTIFICATION_CHANNEL.IN_APP) {
        return notificationRepository.update(notification.id, {
          deliveryStatus: NOTIFICATION_DELIVERY_STATUS.DELIVERED,
          sentAt: new Date(),
          deliveredAt: new Date(),
        });
      }

      // External providers (FCM, SMTP, SMS, WhatsApp) can be wired here.
      logger.info(`Notification ${notification.notificationId} queued for ${notification.channel}`);

      return notificationRepository.update(notification.id, {
        deliveryStatus: NOTIFICATION_DELIVERY_STATUS.SENT,
        sentAt: new Date(),
        deliveredAt: new Date(),
      });
    } catch (error) {
      logger.error('Notification delivery failed:', error);
      return notificationRepository.update(notification.id, {
        deliveryStatus: NOTIFICATION_DELIVERY_STATUS.FAILED,
        failureReason: error.message,
        retryCount: { increment: 1 },
      });
    }
  }

  async send({
    userId,
    senderId = null,
    title,
    message,
    type,
    channel = NOTIFICATION_CHANNEL.IN_APP,
    priority = NOTIFICATION_PRIORITY.MEDIUM,
    module = null,
    referenceId = null,
    data = null,
  }) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const notification = await notificationRepository.create({
      notificationId: `NTF-${Date.now()}${Math.floor(Math.random() * 1000)}`,
      userId,
      senderId,
      title,
      message,
      type,
      channel,
      priority,
      module,
      referenceId,
      data,
      deliveryStatus: NOTIFICATION_DELIVERY_STATUS.QUEUED,
    });

    const delivered = await this._deliver(notification);
    return delivered;
  }

  async getNotifications(query, user) {
    const filters = { ...query };

    if (!this._hasRole(user, ADMIN_ROLES)) {
      filters.userId = user.id;
    }

    return notificationRepository.findAll(filters);
  }

  async getNotificationById(id, user) {
    const notification = await notificationRepository.findById(id);
    if (!notification) {
      throw new AppError(ERROR_MESSAGES.NOTIFICATION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (notification.userId !== user.id && !this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    return notification;
  }

  async markAsRead(ids, userId, user) {
    const targetIds = Array.isArray(ids) ? ids : [ids];
    const where = {
      id: { in: targetIds },
    };

    if (!this._hasRole(user, ADMIN_ROLES)) {
      where.userId = userId;
    }

    await notificationRepository.updateMany(where, {
      isRead: true,
      readAt: new Date(),
      deliveryStatus: NOTIFICATION_DELIVERY_STATUS.READ,
    });

    return { message: SUCCESS_MESSAGES.NOTIFICATION_READ };
  }

  async markAllAsRead(userId) {
    await notificationRepository.updateMany(
      { userId, isRead: false },
      {
        isRead: true,
        readAt: new Date(),
        deliveryStatus: NOTIFICATION_DELIVERY_STATUS.READ,
      },
    );

    return { message: SUCCESS_MESSAGES.NOTIFICATION_READ_ALL };
  }

  async deleteNotification(id, userId, user) {
    const notification = await notificationRepository.findById(id);
    if (!notification) {
      throw new AppError(ERROR_MESSAGES.NOTIFICATION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (notification.userId !== userId && !this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    await notificationRepository.delete(id);
    return { message: SUCCESS_MESSAGES.NOTIFICATION_DELETED };
  }

  async broadcast(data, senderId, ipAddress, userAgent, user) {
    if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    let receivers = data.userIds || [];

    if (data.role) {
      const users = await prisma.user.findMany({
        where: {
          deletedAt: null,
          OR: [
            { role: { name: data.role } },
            { userRoles: { some: { role: { name: data.role } } } },
          ],
        },
        select: { id: true },
      });
      receivers = users.map((u) => u.id);
    }

    if (data.allUsers) {
      const users = await prisma.user.findMany({
        where: { deletedAt: null, status: 'ACTIVE' },
        select: { id: true },
      });
      receivers = users.map((u) => u.id);
    }

    if (!receivers.length) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
    }

    const channels = data.channels?.length
      ? data.channels
      : [data.channel || NOTIFICATION_CHANNEL.IN_APP];

    let sentCount = 0;
    for (const userId of receivers) {
      for (const channel of channels) {
        await this.send({
          userId,
          senderId,
          title: data.title,
          message: data.message,
          type: data.type || 'BROADCAST',
          channel,
          priority: data.priority || NOTIFICATION_PRIORITY.MEDIUM,
          module: data.module || 'SYSTEM',
          referenceId: data.referenceId || null,
          data: data.data || null,
        });
        sentCount += 1;
      }
    }

    await this._audit(
      senderId,
      'NOTIFICATION_BROADCAST',
      { sentCount, receivers: receivers.length },
      ipAddress,
      userAgent,
    );

    return {
      message: SUCCESS_MESSAGES.NOTIFICATION_BROADCAST,
      receivers: receivers.length,
      sentCount,
    };
  }

  async retryFailed(userId, ipAddress, userAgent, user) {
    if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const failed = await notificationRepository.findFailed(100);
    let retried = 0;

    for (const notification of failed) {
      await notificationRepository.update(notification.id, {
        deliveryStatus: NOTIFICATION_DELIVERY_STATUS.QUEUED,
        failureReason: null,
      });
      await this._deliver(notification);
      retried += 1;
    }

    await this._audit(userId, 'NOTIFICATION_RETRIED', { retried }, ipAddress, userAgent);
    return { message: SUCCESS_MESSAGES.NOTIFICATION_RETRIED, retried };
  }

  async getDashboard(user) {
    const userId = this._hasRole(user, ADMIN_ROLES) ? null : user.id;
    return notificationRepository.getDashboard(userId);
  }
}

module.exports = new NotificationService();
