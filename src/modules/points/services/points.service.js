/**
 * Points & loyalty service.
 * Earn/redeem/expire/adjust points and tier management.
 */

const pointsRepository = require('../repositories/points.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const AppError = require('../../../utils/AppError');
const logger = require('../../../utils/logger');
const { prisma } = require('../../../prisma');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
  LOYALTY_TIER,
  POINT_TRANSACTION_TYPE,
  POINT_TRANSACTION_STATUS,
  POINT_RULE_TYPE,
  BOOKING_STATUS,
  ORDER_STATUS,
  PAYMENT_RECORD_STATUS,
  PERMISSION_MODULES,
} = require('../../../constants');

const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN];
const TIER_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 500,
  GOLD: 2000,
  PLATINUM: 5000,
};
const DEFAULT_RULES = [
  {
    type: POINT_RULE_TYPE.PAYMENT,
    name: 'Payment earn',
    points: 1,
    description: '1 point per currency unit paid',
  },
  {
    type: POINT_RULE_TYPE.BOOKING,
    name: 'Booking earn',
    points: 50,
    description: '50 points per completed booking',
  },
  {
    type: POINT_RULE_TYPE.ORDER,
    name: 'Order earn',
    points: 100,
    description: '100 points per completed order',
  },
  {
    type: POINT_RULE_TYPE.REFERRAL,
    name: 'Referral bonus',
    points: 200,
    description: 'Referral bonus points',
  },
  {
    type: POINT_RULE_TYPE.BIRTHDAY,
    name: 'Birthday bonus',
    points: 100,
    description: 'Birthday bonus points',
  },
  {
    type: POINT_RULE_TYPE.CAMPAIGN,
    name: 'Campaign bonus',
    points: 50,
    description: 'Campaign bonus points',
  },
];

class PointsService {
  _hasRole(user, roles) {
    return roles.some((role) => user.roles?.includes(role));
  }

  async _audit(userId, action, payload, ipAddress, userAgent) {
    const entry = {
      userId,
      action,
      module: PERMISSION_MODULES.POINTS,
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

  async _notify(userId, title, message, type, data = {}) {
    try {
      await prisma.notification.create({ data: { userId, title, message, type, data } });
    } catch (error) {
      logger.error('Failed to create points notification:', error);
    }
  }

  _resolveTier(lifetimePoints) {
    if (lifetimePoints >= TIER_THRESHOLDS.PLATINUM) return LOYALTY_TIER.PLATINUM;
    if (lifetimePoints >= TIER_THRESHOLDS.GOLD) return LOYALTY_TIER.GOLD;
    if (lifetimePoints >= TIER_THRESHOLDS.SILVER) return LOYALTY_TIER.SILVER;
    return LOYALTY_TIER.BRONZE;
  }

  async _ensureRules() {
    const rules = await pointsRepository.getRules();
    if (rules.length) return rules;
    for (const rule of DEFAULT_RULES) {
      await pointsRepository.upsertRule(rule.type, rule);
    }
    return pointsRepository.getRules();
  }

  async getOrCreateAccount(customerId) {
    let account = await pointsRepository.findAccountByCustomerId(customerId);
    if (account) return account;

    const customer = await prisma.user.findFirst({
      where: { id: customerId, deletedAt: null },
    });
    if (!customer) throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const count = await prisma.pointAccount.count();
    account = await pointsRepository.createAccount({
      pointWalletId: `PNT-${String(count + 1).padStart(8, '0')}`,
      customerId,
      availablePoints: 0,
      redeemedPoints: 0,
      expiredPoints: 0,
      lifetimePoints: 0,
      currentTier: LOYALTY_TIER.BRONZE,
    });
    return account;
  }

  async _applyPoints({
    customerId,
    points,
    type,
    description,
    bookingId = null,
    orderId = null,
    paymentId = null,
    createdBy = null,
    expiresInDays = 365,
  }) {
    if (!points || points === 0) {
      throw new AppError(ERROR_MESSAGES.POINTS_INVALID_AMOUNT, HTTP_STATUS.BAD_REQUEST);
    }

    return prisma.$transaction(async (tx) => {
      let account = await tx.pointAccount.findUnique({ where: { customerId } });
      if (!account) {
        account = await tx.pointAccount.create({
          data: {
            pointWalletId: `PNT-${Date.now()}`,
            customerId,
          },
        });
      }

      const balanceBefore = account.availablePoints;
      let balanceAfter = balanceBefore;
      let availablePoints = account.availablePoints;
      let redeemedPoints = account.redeemedPoints;
      let expiredPoints = account.expiredPoints;
      let lifetimePoints = account.lifetimePoints;

      if (
        type === POINT_TRANSACTION_TYPE.EARN ||
        type === POINT_TRANSACTION_TYPE.BONUS ||
        (type === POINT_TRANSACTION_TYPE.ADJUSTMENT && points > 0) ||
        type === POINT_TRANSACTION_TYPE.REFUND
      ) {
        const credit = Math.abs(points);
        availablePoints += credit;
        lifetimePoints += credit;
        balanceAfter = availablePoints;
      } else if (
        type === POINT_TRANSACTION_TYPE.REDEEM ||
        type === POINT_TRANSACTION_TYPE.EXPIRE ||
        (type === POINT_TRANSACTION_TYPE.ADJUSTMENT && points < 0)
      ) {
        const debit = Math.abs(points);
        if (availablePoints < debit) {
          throw new AppError(ERROR_MESSAGES.POINTS_INSUFFICIENT, HTTP_STATUS.BAD_REQUEST);
        }
        availablePoints -= debit;
        balanceAfter = availablePoints;
        if (type === POINT_TRANSACTION_TYPE.REDEEM) redeemedPoints += debit;
        if (type === POINT_TRANSACTION_TYPE.EXPIRE) expiredPoints += debit;
      }

      const previousTier = account.currentTier;
      const currentTier = this._resolveTier(lifetimePoints);

      const updatedAccount = await tx.pointAccount.update({
        where: { id: account.id },
        data: {
          availablePoints,
          redeemedPoints,
          expiredPoints,
          lifetimePoints,
          currentTier,
        },
        include: { customer: { select: { id: true, fullName: true, email: true } } },
      });

      const transaction = await tx.pointTransaction.create({
        data: {
          referenceNumber: `PREF-${Date.now()}${Math.floor(Math.random() * 1000)}`,
          pointAccountId: account.id,
          customerId,
          type,
          points:
            type === POINT_TRANSACTION_TYPE.REDEEM || type === POINT_TRANSACTION_TYPE.EXPIRE
              ? -Math.abs(points)
              : points,
          balanceBefore,
          balanceAfter,
          status:
            type === POINT_TRANSACTION_TYPE.EXPIRE
              ? POINT_TRANSACTION_STATUS.EXPIRED
              : POINT_TRANSACTION_STATUS.COMPLETED,
          bookingId,
          orderId,
          paymentId,
          description,
          expiresAt:
            type === POINT_TRANSACTION_TYPE.EARN || type === POINT_TRANSACTION_TYPE.BONUS
              ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
              : null,
          createdBy,
        },
      });

      return { account: updatedAccount, transaction, previousTier, currentTier };
    });
  }

  async getPoints(user) {
    const account = await this.getOrCreateAccount(user.id);
    return { account };
  }

  async getBalance(user) {
    const account = await this.getOrCreateAccount(user.id);
    return {
      pointWalletId: account.pointWalletId,
      availablePoints: account.availablePoints,
      redeemedPoints: account.redeemedPoints,
      expiredPoints: account.expiredPoints,
      lifetimePoints: account.lifetimePoints,
      currentTier: account.currentTier,
    };
  }

  async getHistory(query, user) {
    const account = await this.getOrCreateAccount(user.id);
    return pointsRepository.findTransactions({ ...query, customerId: account.customerId });
  }

  async redeem(data, user, ipAddress, userAgent) {
    const points = Number(data.points);
    const result = await this._applyPoints({
      customerId: user.id,
      points,
      type: POINT_TRANSACTION_TYPE.REDEEM,
      description: data.description || 'Points redeemed',
      createdBy: user.id,
    });

    await this._audit(user.id, 'POINTS_REDEEMED', { points }, ipAddress, userAgent);
    await this._notify(
      user.id,
      'Points Redeemed',
      `You redeemed ${points} points.`,
      'POINTS_REDEEMED',
      { points },
    );

    return { message: SUCCESS_MESSAGES.POINTS_REDEEMED, ...result };
  }

  async awardForBooking(bookingId, createdBy = null) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
    });
    if (!booking) throw new AppError(ERROR_MESSAGES.BOOKING_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    if (booking.status !== BOOKING_STATUS.COMPLETED) {
      throw new AppError(ERROR_MESSAGES.REVIEW_NOT_ALLOWED, HTTP_STATUS.BAD_REQUEST);
    }

    const existing = await pointsRepository.findExistingEarn(booking.customerId, { bookingId });
    if (existing) throw new AppError(ERROR_MESSAGES.POINTS_ALREADY_AWARDED, HTTP_STATUS.CONFLICT);

    await this._ensureRules();
    const rules = await pointsRepository.getRules();
    const rule = rules.find((r) => r.type === POINT_RULE_TYPE.BOOKING && r.isActive);
    const points = rule?.points || 50;

    const result = await this._applyPoints({
      customerId: booking.customerId,
      points,
      type: POINT_TRANSACTION_TYPE.EARN,
      description: `Points for booking ${booking.bookingNumber}`,
      bookingId,
      createdBy,
    });

    await this._notify(
      booking.customerId,
      'Points Earned',
      `You earned ${points} points for your booking.`,
      'POINTS_EARNED',
      { points, bookingId },
    );

    if (result.previousTier !== result.currentTier) {
      await this._notify(
        booking.customerId,
        'Tier Upgraded',
        `Congratulations! You reached ${result.currentTier} tier.`,
        'TIER_UPGRADED',
        { tier: result.currentTier },
      );
    }

    return result;
  }

  async awardForOrder(orderId, createdBy = null) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
    });
    if (!order) throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    if (order.status !== ORDER_STATUS.DELIVERED) {
      throw new AppError(ERROR_MESSAGES.REVIEW_NOT_ALLOWED, HTTP_STATUS.BAD_REQUEST);
    }

    const existing = await pointsRepository.findExistingEarn(order.customerId, { orderId });
    if (existing) throw new AppError(ERROR_MESSAGES.POINTS_ALREADY_AWARDED, HTTP_STATUS.CONFLICT);

    await this._ensureRules();
    const rules = await pointsRepository.getRules();
    const rule = rules.find((r) => r.type === POINT_RULE_TYPE.ORDER && r.isActive);
    const points = rule?.points || 100;

    const result = await this._applyPoints({
      customerId: order.customerId,
      points,
      type: POINT_TRANSACTION_TYPE.EARN,
      description: `Points for order ${order.orderNumber}`,
      orderId,
      createdBy,
    });

    await this._notify(
      order.customerId,
      'Points Earned',
      `You earned ${points} points for your order.`,
      'POINTS_EARNED',
      { points, orderId },
    );

    return result;
  }

  async awardForPayment(paymentId, createdBy = null) {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, deletedAt: null },
    });
    if (!payment) throw new AppError(ERROR_MESSAGES.PAYMENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    if (payment.status !== PAYMENT_RECORD_STATUS.SUCCESSFUL) {
      throw new AppError(ERROR_MESSAGES.PAYMENT_INVALID_AMOUNT, HTTP_STATUS.BAD_REQUEST);
    }

    const existing = await pointsRepository.findExistingEarn(payment.customerId, { paymentId });
    if (existing) throw new AppError(ERROR_MESSAGES.POINTS_ALREADY_AWARDED, HTTP_STATUS.CONFLICT);

    await this._ensureRules();
    const rules = await pointsRepository.getRules();
    const rule = rules.find((r) => r.type === POINT_RULE_TYPE.PAYMENT && r.isActive);
    const pointsPerUnit = rule?.points || 1;
    const points = Math.floor(Number(payment.grandTotal) * pointsPerUnit);

    if (points <= 0) return null;

    const result = await this._applyPoints({
      customerId: payment.customerId,
      points,
      type: POINT_TRANSACTION_TYPE.EARN,
      description: `Points for payment ${payment.paymentId}`,
      paymentId,
      createdBy,
    });

    await this._notify(
      payment.customerId,
      'Points Earned',
      `You earned ${points} points for your payment.`,
      'POINTS_EARNED',
      { points, paymentId },
    );

    return result;
  }

  async reverseForCancellation({
    customerId,
    orderId = null,
    bookingId = null,
    points,
    createdBy = null,
  }) {
    return this._applyPoints({
      customerId,
      points: -Math.abs(points),
      type: POINT_TRANSACTION_TYPE.ADJUSTMENT,
      description: 'Points reversed due to cancellation',
      orderId,
      bookingId,
      createdBy,
    });
  }

  async getCustomerDashboard(user) {
    const account = await this.getOrCreateAccount(user.id);
    const recent = await pointsRepository.findTransactions({
      customerId: user.id,
      type: POINT_TRANSACTION_TYPE.EARN,
      page: 1,
      limit: 5,
    });
    return {
      availablePoints: account.availablePoints,
      lifetimePoints: account.lifetimePoints,
      currentTier: account.currentTier,
      recentRewards: recent.transactions,
    };
  }

  // Admin
  async getAccounts(query, user) {
    if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
    return pointsRepository.findAllAccounts(query);
  }

  async adjust(data, userId, ipAddress, userAgent, user) {
    if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const points =
      data.direction === 'DEBIT' ? -Math.abs(Number(data.points)) : Math.abs(Number(data.points));
    const type =
      data.bonusType === 'BIRTHDAY' ||
      data.bonusType === 'REFERRAL' ||
      data.bonusType === 'CAMPAIGN'
        ? POINT_TRANSACTION_TYPE.BONUS
        : POINT_TRANSACTION_TYPE.ADJUSTMENT;

    const result = await this._applyPoints({
      customerId: data.customerId,
      points,
      type,
      description: data.reason || `Admin ${data.direction || 'CREDIT'} adjustment`,
      createdBy: userId,
    });

    await this._audit(
      userId,
      'POINTS_ADJUSTED',
      { customerId: data.customerId, points },
      ipAddress,
      userAgent,
    );

    return { message: SUCCESS_MESSAGES.POINTS_ADJUSTED, ...result };
  }

  async expirePoints(userId, ipAddress, userAgent, user) {
    if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const expiredTxns = await pointsRepository.findExpirableTransactions(new Date());
    let expiredCount = 0;

    for (const txn of expiredTxns) {
      try {
        await this._applyPoints({
          customerId: txn.customerId,
          points: Math.abs(txn.points),
          type: POINT_TRANSACTION_TYPE.EXPIRE,
          description: `Expired points from ${txn.referenceNumber}`,
          createdBy: userId,
        });
        expiredCount += 1;
      } catch {
        // skip insufficient/already handled
      }
    }

    await this._audit(userId, 'POINTS_EXPIRED', { expiredCount }, ipAddress, userAgent);
    return { message: SUCCESS_MESSAGES.POINTS_EXPIRED, expiredCount };
  }

  async updateRules(rules, userId, ipAddress, userAgent, user) {
    if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    await this._ensureRules();
    const updated = [];
    for (const rule of rules) {
      const item = await pointsRepository.upsertRule(rule.type, {
        name: rule.name,
        points: rule.points,
        minAmount: rule.minAmount ?? null,
        isActive: rule.isActive ?? true,
        description: rule.description ?? null,
        updatedBy: userId,
      });
      updated.push(item);
    }

    await this._audit(
      userId,
      'POINTS_RULES_UPDATED',
      { count: updated.length },
      ipAddress,
      userAgent,
    );
    return { message: SUCCESS_MESSAGES.POINTS_RULES_UPDATED, rules: updated };
  }

  async getRules(user) {
    if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
    return this._ensureRules();
  }

  async getAdminDashboard(user) {
    if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
    return pointsRepository.getAdminDashboard();
  }
}

module.exports = new PointsService();
