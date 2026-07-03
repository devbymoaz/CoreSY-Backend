/**
 * Payment service.
 * Payment and transaction management across CoreSY Pass, Care, and Go.
 */

const paymentRepository = require('../repositories/payment.repository');
const walletService = require('../../wallet/services/wallet.service');
const auditLogService = require('../../rbac/services/audit-log.service');
const AppError = require('../../../utils/AppError');
const logger = require('../../../utils/logger');
const { prisma } = require('../../../prisma');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
  PAYMENT_METHOD_TYPE,
  PAYMENT_RECORD_STATUS,
  PAYMENT_TYPE,
  PAYMENT_STATUS,
  WALLET_TRANSACTION_TYPE,
  PERMISSION_MODULES,
  SUBSCRIPTION_TIERS,
} = require('../../../constants');

const PLATFORM_FEE_RATE = 0.02;
const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN];

class PaymentService {
  _hasRole(user, roles) {
    return roles.some((role) => user.roles?.includes(role));
  }

  async _audit(userId, action, payload, ipAddress, userAgent) {
    const entry = {
      userId,
      action,
      module: PERMISSION_MODULES.PAYMENTS,
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
      await prisma.notification.create({
        data: { userId, title, message, type, data },
      });
    } catch (error) {
      logger.error('Failed to create payment notification:', error);
    }
  }

  async _generateIds() {
    const stamp = Date.now();
    const rand = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return {
      paymentId: `PAY-${stamp}${rand}`,
      transactionNumber: `TXN-${stamp}${rand}`,
      invoiceNumber: `PINV-${stamp}${rand}`,
    };
  }

  _mapLegacyPaymentStatus(status, method) {
    if (status === PAYMENT_RECORD_STATUS.SUCCESSFUL) {
      if (method === PAYMENT_METHOD_TYPE.CASH) return PAYMENT_STATUS.CASH;
      if (method === PAYMENT_METHOD_TYPE.WALLET) return PAYMENT_STATUS.WALLET;
      return PAYMENT_STATUS.PAID;
    }
    if (
      status === PAYMENT_RECORD_STATUS.REFUNDED ||
      status === PAYMENT_RECORD_STATUS.PARTIALLY_REFUNDED
    ) {
      return PAYMENT_STATUS.REFUNDED;
    }
    if (status === PAYMENT_RECORD_STATUS.FAILED) return PAYMENT_STATUS.FAILED;
    return PAYMENT_STATUS.PENDING;
  }

  _buildInvoice(payment) {
    return {
      invoiceNumber: payment.invoiceNumber,
      paymentId: payment.paymentId,
      transactionNumber: payment.transactionNumber,
      issuedAt: new Date().toISOString(),
      customer: payment.customer,
      business: payment.business,
      branch: payment.branch,
      bookingNumber: payment.booking?.bookingNumber || null,
      orderNumber: payment.order?.orderNumber || null,
      paymentMethod: payment.paymentMethod,
      paymentType: payment.paymentType,
      status: payment.status,
      totals: {
        subtotal: Number(payment.subtotal),
        discount: Number(payment.discount),
        subscriberDiscount: Number(payment.subscriberDiscount),
        platformFee: Number(payment.platformFee),
        deliveryFee: Number(payment.deliveryFee),
        tax: Number(payment.tax),
        grandTotal: Number(payment.grandTotal),
        refundedAmount: Number(payment.refundedAmount),
        currency: payment.currency,
      },
    };
  }

  _buildReceipt(payment) {
    return {
      receiptNumber: `RCPT-${payment.paymentId}`,
      paymentId: payment.paymentId,
      transactionNumber: payment.transactionNumber,
      paidAt: payment.completedAt || payment.transactionDate,
      amount: Number(payment.grandTotal),
      currency: payment.currency,
      method: payment.paymentMethod,
      status: payment.status,
      customerName: payment.customer?.fullName,
    };
  }

  async _updateRelatedPaymentStatus(payment, status) {
    const legacyStatus = this._mapLegacyPaymentStatus(status, payment.paymentMethod);

    if (payment.bookingId) {
      await prisma.booking.update({
        where: { id: payment.bookingId },
        data: {
          paymentStatus: legacyStatus,
          paymentMethod: payment.paymentMethod,
        },
      });
    }

    if (payment.orderId) {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: legacyStatus },
      });
    }
  }

  async createPayment(data, userId, ipAddress, userAgent, user) {
    const customerId = data.customerId || userId;
    if (customerId !== userId && !this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const customer = await prisma.user.findFirst({
      where: { id: customerId, deletedAt: null },
    });
    if (!customer) throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    let booking = null;
    let order = null;
    let businessId = data.businessId || null;
    let branchId = data.branchId || null;
    let paymentType = data.paymentType || PAYMENT_TYPE.OTHER;
    let subtotal = Number(data.subtotal || 0);
    let discount = Number(data.discount || 0);
    let subscriberDiscount = Number(data.subscriberDiscount || 0);
    let deliveryFee = Number(data.deliveryFee || 0);
    let tax = Number(data.tax || 0);

    if (data.bookingId) {
      booking = await prisma.booking.findFirst({
        where: { id: data.bookingId, deletedAt: null },
      });
      if (!booking) throw new AppError(ERROR_MESSAGES.BOOKING_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
      if (booking.customerId !== customerId && !this._hasRole(user, ADMIN_ROLES)) {
        throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
      }

      const existing = await paymentRepository.findSuccessfulByBookingId(data.bookingId);
      if (existing) {
        throw new AppError(ERROR_MESSAGES.PAYMENT_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }

      businessId = booking.businessId;
      branchId = booking.branchId;
      paymentType = PAYMENT_TYPE.BOOKING;
    }

    if (data.orderId) {
      order = await prisma.order.findFirst({
        where: { id: data.orderId, deletedAt: null },
        include: { businessOrders: true },
      });
      if (!order) throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
      if (order.customerId !== customerId && !this._hasRole(user, ADMIN_ROLES)) {
        throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
      }

      const existing = await paymentRepository.findSuccessfulByOrderId(data.orderId);
      if (existing) {
        throw new AppError(ERROR_MESSAGES.PAYMENT_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }

      businessId = order.businessOrders[0]?.businessId || businessId;
      branchId = order.businessOrders[0]?.branchId || branchId;
      paymentType = PAYMENT_TYPE.ORDER;
      subtotal = Number(order.totalAmount);
      discount = Number(order.discount);
      subscriberDiscount = Number(order.subscriberDiscount);
      deliveryFee = Number(order.deliveryFee);
      tax = Number(order.tax);
    }

    if (businessId) {
      const business = await prisma.business.findFirst({
        where: { id: businessId, deletedAt: null },
      });
      if (!business) throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
    }

    if (branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: branchId, deletedAt: null },
      });
      if (!branch) throw new AppError(ERROR_MESSAGES.BRANCH_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
    }

    const isSubscriber = customer.subscription !== SUBSCRIPTION_TIERS.FREE;
    if (isSubscriber && !subscriberDiscount && subtotal > 0) {
      subscriberDiscount = Number((subtotal * 0.05).toFixed(2));
    }

    const netAmount = Math.max(subtotal - discount - subscriberDiscount, 0);
    const platformFee =
      data.platformFee != null
        ? Number(data.platformFee)
        : Number((netAmount * PLATFORM_FEE_RATE).toFixed(2));
    const grandTotal =
      data.grandTotal != null
        ? Number(data.grandTotal)
        : Number((netAmount + platformFee + deliveryFee + tax).toFixed(2));

    if (grandTotal <= 0) {
      throw new AppError(ERROR_MESSAGES.PAYMENT_INVALID_AMOUNT, HTTP_STATUS.BAD_REQUEST);
    }

    const ids = await this._generateIds();
    let status = PAYMENT_RECORD_STATUS.PENDING;
    let failureReason = null;
    let gatewayReference = data.gatewayReference || null;

    try {
      if (data.paymentMethod === PAYMENT_METHOD_TYPE.WALLET) {
        await walletService.debitWallet({
          customerId,
          amount: grandTotal,
          type: WALLET_TRANSACTION_TYPE.DEBIT,
          description: `Payment ${ids.paymentId}`,
          bookingId: data.bookingId || null,
          orderId: data.orderId || null,
          createdBy: userId,
        });
        status = PAYMENT_RECORD_STATUS.SUCCESSFUL;
      } else if (data.paymentMethod === PAYMENT_METHOD_TYPE.CASH) {
        status = PAYMENT_RECORD_STATUS.SUCCESSFUL;
      } else {
        // Card/gateway methods are recorded as successful with a mock gateway reference
        // until real gateway integration is added.
        gatewayReference = gatewayReference || `GW-${ids.transactionNumber}`;
        status = PAYMENT_RECORD_STATUS.SUCCESSFUL;
      }
    } catch (error) {
      if (error.message === ERROR_MESSAGES.WALLET_INSUFFICIENT_BALANCE) {
        status = PAYMENT_RECORD_STATUS.FAILED;
        failureReason = error.message;
      } else {
        throw error;
      }
    }

    const payment = await paymentRepository.create({
      paymentId: ids.paymentId,
      transactionNumber: ids.transactionNumber,
      bookingId: data.bookingId || null,
      orderId: data.orderId || null,
      customerId,
      businessId,
      branchId,
      paymentMethod: data.paymentMethod,
      paymentType,
      subtotal,
      discount,
      subscriberDiscount,
      platformFee,
      deliveryFee,
      tax,
      grandTotal,
      currency: data.currency || 'SYP',
      status,
      gatewayReference,
      invoiceNumber: ids.invoiceNumber,
      failureReason,
      completedAt: status === PAYMENT_RECORD_STATUS.SUCCESSFUL ? new Date() : null,
      createdBy: userId,
    });

    const invoiceData = this._buildInvoice(payment);
    const receiptData = this._buildReceipt(payment);
    const finalized = await paymentRepository.update(payment.id, {
      invoiceData,
      receiptData,
    });

    if (status === PAYMENT_RECORD_STATUS.SUCCESSFUL) {
      await this._updateRelatedPaymentStatus(finalized, status);
      await this._notify(
        customerId,
        'Payment Successful',
        `Payment ${finalized.paymentId} completed successfully.`,
        'PAYMENT_SUCCESSFUL',
        { paymentId: finalized.id },
      );
      await this._notify(
        customerId,
        'Invoice Generated',
        `Invoice ${finalized.invoiceNumber} is ready.`,
        'INVOICE_GENERATED',
        { paymentId: finalized.id },
      );
    } else if (status === PAYMENT_RECORD_STATUS.FAILED) {
      await this._notify(
        customerId,
        'Payment Failed',
        `Payment ${finalized.paymentId} failed.`,
        'PAYMENT_FAILED',
        { paymentId: finalized.id },
      );
    }

    await this._audit(
      userId,
      'PAYMENT_CREATED',
      { paymentId: finalized.id, status },
      ipAddress,
      userAgent,
    );

    if (status === PAYMENT_RECORD_STATUS.FAILED) {
      return { message: SUCCESS_MESSAGES.PAYMENT_FAILED, payment: finalized };
    }

    return { message: SUCCESS_MESSAGES.PAYMENT_CREATED, payment: finalized };
  }

  async getPayments(query, user) {
    const filters = { ...query };
    if (this._hasRole(user, [ROLES.USER]) && !this._hasRole(user, ADMIN_ROLES)) {
      filters.customerId = user.id;
    }
    return paymentRepository.findAll(filters);
  }

  async getHistory(query, user) {
    return this.getPayments({ ...query, historyOnly: true }, user);
  }

  async getPaymentById(id, user) {
    const payment = await paymentRepository.findById(id);
    if (!payment) throw new AppError(ERROR_MESSAGES.PAYMENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const isOwner = payment.customerId === user.id;
    const isBusinessOwner =
      this._hasRole(user, [ROLES.BUSINESS_OWNER]) && payment.business?.ownerId === user.id;
    const isAdmin = this._hasRole(user, ADMIN_ROLES);

    if (!isOwner && !isBusinessOwner && !isAdmin) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    return payment;
  }

  async getInvoice(id, user) {
    const payment = await this.getPaymentById(id, user);
    return {
      invoice: payment.invoiceData || this._buildInvoice(payment),
      receipt: payment.receiptData || this._buildReceipt(payment),
    };
  }

  async verifyPayment(id, userId, ipAddress, userAgent, user) {
    if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const payment = await paymentRepository.findById(id);
    if (!payment) throw new AppError(ERROR_MESSAGES.PAYMENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (
      payment.status !== PAYMENT_RECORD_STATUS.PENDING &&
      payment.status !== PAYMENT_RECORD_STATUS.PROCESSING
    ) {
      throw new AppError(ERROR_MESSAGES.PAYMENT_CANNOT_BE_CANCELLED, HTTP_STATUS.BAD_REQUEST);
    }

    const updated = await paymentRepository.update(id, {
      status: PAYMENT_RECORD_STATUS.SUCCESSFUL,
      completedAt: new Date(),
      updatedBy: userId,
    });

    await this._updateRelatedPaymentStatus(updated, PAYMENT_RECORD_STATUS.SUCCESSFUL);
    await this._audit(userId, 'PAYMENT_COMPLETED', { paymentId: id }, ipAddress, userAgent);

    return { message: SUCCESS_MESSAGES.PAYMENT_VERIFIED, payment: updated };
  }

  async cancelPayment(id, reason, userId, ipAddress, userAgent, user) {
    const payment = await paymentRepository.findById(id);
    if (!payment) throw new AppError(ERROR_MESSAGES.PAYMENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const isOwner = payment.customerId === user.id;
    const isAdmin = this._hasRole(user, ADMIN_ROLES);
    if (!isOwner && !isAdmin) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    if (
      ![PAYMENT_RECORD_STATUS.PENDING, PAYMENT_RECORD_STATUS.PROCESSING].includes(payment.status)
    ) {
      throw new AppError(ERROR_MESSAGES.PAYMENT_CANNOT_BE_CANCELLED, HTTP_STATUS.BAD_REQUEST);
    }

    const updated = await paymentRepository.update(id, {
      status: PAYMENT_RECORD_STATUS.CANCELLED,
      cancellationReason: reason || null,
      updatedBy: userId,
    });

    await this._audit(userId, 'PAYMENT_CANCELLED', { paymentId: id }, ipAddress, userAgent);
    return { message: SUCCESS_MESSAGES.PAYMENT_CANCELLED, payment: updated };
  }

  async refundPayment(data, userId, ipAddress, userAgent, user) {
    if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const payment = await paymentRepository.findById(data.paymentId);
    if (!payment) throw new AppError(ERROR_MESSAGES.PAYMENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (
      ![PAYMENT_RECORD_STATUS.SUCCESSFUL, PAYMENT_RECORD_STATUS.PARTIALLY_REFUNDED].includes(
        payment.status,
      )
    ) {
      throw new AppError(ERROR_MESSAGES.PAYMENT_CANNOT_BE_REFUNDED, HTTP_STATUS.BAD_REQUEST);
    }

    const refundAmount = Number(data.amount ?? payment.grandTotal);
    const alreadyRefunded = Number(payment.refundedAmount || 0);
    const refundable = Number(payment.grandTotal) - alreadyRefunded;

    if (refundAmount <= 0 || refundAmount > refundable) {
      throw new AppError(ERROR_MESSAGES.PAYMENT_INVALID_REFUND_AMOUNT, HTTP_STATUS.BAD_REQUEST);
    }

    await walletService.creditWallet({
      customerId: payment.customerId,
      amount: refundAmount,
      type: WALLET_TRANSACTION_TYPE.REFUND,
      description: `Refund for payment ${payment.paymentId}`,
      bookingId: payment.bookingId,
      orderId: payment.orderId,
      paymentId: payment.id,
      createdBy: userId,
    });

    const newRefundedAmount = Number((alreadyRefunded + refundAmount).toFixed(2));
    const status =
      newRefundedAmount >= Number(payment.grandTotal)
        ? PAYMENT_RECORD_STATUS.REFUNDED
        : PAYMENT_RECORD_STATUS.PARTIALLY_REFUNDED;

    const updated = await paymentRepository.update(payment.id, {
      status,
      refundedAmount: newRefundedAmount,
      refundReason: data.reason || null,
      updatedBy: userId,
    });

    await this._updateRelatedPaymentStatus(updated, status);
    await this._audit(
      userId,
      'PAYMENT_REFUNDED',
      { paymentId: payment.id, refundAmount },
      ipAddress,
      userAgent,
    );
    await this._notify(
      payment.customerId,
      'Refund Processed',
      `Refund of ${refundAmount} ${payment.currency} was credited to your wallet.`,
      'REFUND_PROCESSED',
      { paymentId: payment.id, refundAmount },
    );

    return { message: SUCCESS_MESSAGES.PAYMENT_REFUNDED, payment: updated };
  }

  async getBusinessPayments(query, user) {
    const filters = { ...query };
    if (this._hasRole(user, [ROLES.BUSINESS_OWNER]) && !this._hasRole(user, ADMIN_ROLES)) {
      const businesses = await prisma.business.findMany({
        where: { ownerId: user.id, deletedAt: null },
        select: { id: true },
      });
      filters.businessIds = businesses.map((b) => b.id);
    } else if (!this._hasRole(user, ADMIN_ROLES.concat([ROLES.BUSINESS_OWNER]))) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
    return paymentRepository.findAll(filters);
  }

  async getTodayBusinessPayments(query, user) {
    return this.getBusinessPayments({ ...query, todayOnly: true }, user);
  }

  async getBusinessTransactions(query, user) {
    return this.getBusinessPayments(query, user);
  }

  async getAdminPayments(query, user) {
    if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
    return paymentRepository.findAll(query);
  }

  async getCustomerDashboard(user) {
    return paymentRepository.getCustomerDashboard(user.id);
  }

  async getBusinessDashboard(query, user) {
    const filters = { ...query };
    if (this._hasRole(user, [ROLES.BUSINESS_OWNER]) && !this._hasRole(user, ADMIN_ROLES)) {
      const businesses = await prisma.business.findMany({
        where: { ownerId: user.id, deletedAt: null },
        select: { id: true },
      });
      filters.businessIds = businesses.map((b) => b.id);
    }
    return paymentRepository.getBusinessDashboard(filters);
  }

  async getPlatformDashboard(user) {
    if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
    return paymentRepository.getPlatformDashboard();
  }
}

module.exports = new PaymentService();
