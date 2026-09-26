/**
 * Order QR service.
 * Delivery pickup QR, delivery/payment QR, and pickup handover/payment QR.
 */

const crypto = require('crypto');
const orderQRRepository = require('../repositories/order-qr.repository');
const orderRepository = require('../repositories/order.repository');
const paymentService = require('../../payment/services/payment.service');
const auditLogService = require('../../rbac/services/audit-log.service');
const AppError = require('../../../utils/AppError');
const { comparePassword } = require('../../../utils/password');
const { prisma } = require('../../../prisma');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ORDER_QR_PURPOSE,
  ORDER_QR_STATUS,
  ORDER_STATUS,
  ORDER_FULFILLMENT_TYPE,
  ORDER_PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYMENT_METHOD_TYPE,
  DRIVER_AVAILABILITY_STATUS,
  ROLES,
  PERMISSION_MODULES,
} = require('../../../constants');

const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.SUPPORT_ADMIN, ROLES.FINANCE_ADMIN];
const BUSINESS_ROLES = [ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER];

function generateQrId(prefix = 'OQR') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

class OrderQRService {
  _hasRole(user, roles) {
    return roles.some((role) => user.roles?.includes(role));
  }

  async _audit(userId, action, payload, ipAddress, userAgent) {
    await auditLogService.create({
      userId,
      action,
      module: PERMISSION_MODULES.ORDERS || 'Orders',
      ipAddress,
      userAgent,
      payload,
    });
  }

  async _assertActive(qr) {
    if (!qr) throw new AppError(ERROR_MESSAGES.ORDER_QR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    if (qr.expiresAt && new Date() > new Date(qr.expiresAt)) {
      if (qr.status === ORDER_QR_STATUS.ACTIVE) {
        await orderQRRepository.update(qr.id, { status: ORDER_QR_STATUS.EXPIRED });
      }
      throw new AppError(ERROR_MESSAGES.ORDER_QR_EXPIRED, HTTP_STATUS.BAD_REQUEST);
    }
    if ([ORDER_QR_STATUS.COMPLETED, ORDER_QR_STATUS.PAID, ORDER_QR_STATUS.CANCELLED].includes(qr.status)) {
      throw new AppError(ERROR_MESSAGES.ORDER_QR_ALREADY_USED, HTTP_STATUS.CONFLICT);
    }
    if (![ORDER_QR_STATUS.ACTIVE, ORDER_QR_STATUS.SCANNED].includes(qr.status)) {
      throw new AppError(ERROR_MESSAGES.ORDER_QR_INACTIVE, HTTP_STATUS.BAD_REQUEST);
    }
  }

  _payload(qr) {
    return {
      id: qr.id,
      qrId: qr.qrId,
      token: qr.token,
      purpose: qr.purpose,
      status: qr.status,
      orderId: qr.orderId,
      businessOrderId: qr.businessOrderId,
      customerId: qr.customerId,
      businessId: qr.businessId,
      branchId: qr.branchId,
      driverId: qr.driverId,
      amount: qr.amount != null ? Number(qr.amount) : null,
      payableAmount: qr.payableAmount != null ? Number(qr.payableAmount) : null,
      currency: qr.currency,
      paymentMethod: qr.paymentMethod,
      expiresAt: qr.expiresAt,
      scannedAt: qr.scannedAt,
      paidAt: qr.paidAt,
      order: qr.order,
      businessOrder: qr.businessOrder,
      scanPayload: {
        type: 'ORDER_QR',
        purpose: qr.purpose,
        token: qr.token,
        qrId: qr.qrId,
        orderId: qr.orderId,
        businessOrderId: qr.businessOrderId,
      },
    };
  }

  async createDriverPickupQR(businessOrder, createdBy = null) {
    await orderQRRepository.cancelActiveByPurpose(
      businessOrder.id,
      ORDER_QR_PURPOSE.DRIVER_PICKUP,
    );

    const order = businessOrder.order || (await orderRepository.findById(businessOrder.orderId));
    const qr = await orderQRRepository.create({
      qrId: generateQrId('DPQ'),
      token: generateToken(),
      purpose: ORDER_QR_PURPOSE.DRIVER_PICKUP,
      status: ORDER_QR_STATUS.ACTIVE,
      orderId: businessOrder.orderId,
      businessOrderId: businessOrder.id,
      customerId: order.customerId,
      businessId: businessOrder.businessId,
      branchId: businessOrder.branchId,
      driverId: businessOrder.driverId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdBy,
    });

    return this._payload(qr);
  }

  async createDeliveryPaymentQR(businessOrder, createdBy = null) {
    const existing = await orderQRRepository.findActiveByPurpose(
      businessOrder.id,
      ORDER_QR_PURPOSE.DELIVERY_PAYMENT,
    );
    if (existing && existing.status === ORDER_QR_STATUS.ACTIVE) {
      return this._payload(existing);
    }

    await orderQRRepository.cancelActiveByPurpose(
      businessOrder.id,
      ORDER_QR_PURPOSE.DELIVERY_PAYMENT,
    );

    const order = businessOrder.order || (await orderRepository.findById(businessOrder.orderId));
    const amount = Number(order.grandTotal || businessOrder.total || 0);

    const qr = await orderQRRepository.create({
      qrId: generateQrId('DPY'),
      token: generateToken(),
      purpose: ORDER_QR_PURPOSE.DELIVERY_PAYMENT,
      status: ORDER_QR_STATUS.ACTIVE,
      orderId: businessOrder.orderId,
      businessOrderId: businessOrder.id,
      customerId: order.customerId,
      businessId: businessOrder.businessId,
      branchId: businessOrder.branchId,
      driverId: businessOrder.driverId,
      amount,
      payableAmount: amount,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdBy,
    });

    return this._payload(qr);
  }

  async createPickupQRsForOrder(order, createdBy = null) {
    if (order.fulfillmentType !== ORDER_FULFILLMENT_TYPE.PICKUP) return [];

    const qrs = [];
    for (const bo of order.businessOrders || []) {
      const amount = Number(order.grandTotal || bo.total || 0);

      const handover = await orderQRRepository.create({
        qrId: generateQrId('PHQ'),
        token: generateToken(),
        purpose: ORDER_QR_PURPOSE.PICKUP_HANDOVER,
        status: ORDER_QR_STATUS.ACTIVE,
        orderId: order.id,
        businessOrderId: bo.id,
        customerId: order.customerId,
        businessId: bo.businessId,
        branchId: bo.branchId,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        createdBy,
      });

      const payment = await orderQRRepository.create({
        qrId: generateQrId('PPY'),
        token: generateToken(),
        purpose: ORDER_QR_PURPOSE.PICKUP_PAYMENT,
        status: ORDER_QR_STATUS.ACTIVE,
        orderId: order.id,
        businessOrderId: bo.id,
        customerId: order.customerId,
        businessId: bo.businessId,
        branchId: bo.branchId,
        amount,
        payableAmount: amount,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        createdBy,
      });

      qrs.push(this._payload(handover), this._payload(payment));
    }

    return qrs;
  }

  async getByToken(token) {
    const qr = await orderQRRepository.findByToken(token);
    await this._assertActive(qr);
    return { orderQr: this._payload(qr) };
  }

  async getByOrderId(orderId, actor) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const isCustomer = order.customerId === (actor.id || actor.customerId);
    const isAdmin = actor.roles && this._hasRole(actor, ADMIN_ROLES);
    const isBusiness =
      actor.roles &&
      this._hasRole(actor, BUSINESS_ROLES) &&
      order.businessOrders.some((bo) => bo.business?.ownerId === actor.id);

    if (!isCustomer && !isAdmin && !isBusiness && !actor.driverId) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const qrs = await orderQRRepository.findByOrderId(orderId);
    return { orderQrs: qrs.map((q) => this._payload(q)) };
  }

  async getByBusinessOrderId(businessOrderId, actor) {
    const businessOrder = await orderRepository.findBusinessOrderById(businessOrderId);
    if (!businessOrder) {
      throw new AppError(ERROR_MESSAGES.BUSINESS_ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (actor.driverId && businessOrder.driverId !== actor.driverId && businessOrder.driverId !== actor.id) {
      throw new AppError(ERROR_MESSAGES.ORDER_DRIVER_NOT_YOURS, HTTP_STATUS.FORBIDDEN);
    }

    const qrs = await orderQRRepository.findByBusinessOrderId(businessOrderId);
    return { orderQrs: qrs.map((q) => this._payload(q)), businessOrder };
  }

  async ensureDeliveryPaymentQR(businessOrderId, driver) {
    const businessOrder = await orderRepository.findBusinessOrderById(businessOrderId);
    if (!businessOrder) {
      throw new AppError(ERROR_MESSAGES.BUSINESS_ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    if (businessOrder.driverId !== driver.id) {
      throw new AppError(ERROR_MESSAGES.ORDER_DRIVER_NOT_YOURS, HTTP_STATUS.FORBIDDEN);
    }
    if (
      ![ORDER_STATUS.PICKED_UP, ORDER_STATUS.ON_THE_WAY, ORDER_STATUS.ASSIGNED].includes(
        businessOrder.status,
      )
    ) {
      throw new AppError(ERROR_MESSAGES.ORDER_INVALID_STATUS_TRANSITION, HTTP_STATUS.BAD_REQUEST);
    }

    const orderQr = await this.createDeliveryPaymentQR(businessOrder, driver.id);
    return { message: SUCCESS_MESSAGES.ORDER_QR_GENERATED, orderQr };
  }

  async scan(token, actor, ipAddress, userAgent) {
    const qr = await orderQRRepository.findByToken(token);
    await this._assertActive(qr);

    if (qr.purpose === ORDER_QR_PURPOSE.DRIVER_PICKUP) {
      return this._scanDriverPickup(qr, actor, ipAddress, userAgent);
    }
    if (qr.purpose === ORDER_QR_PURPOSE.PICKUP_HANDOVER) {
      return this._scanPickupHandover(qr, actor, ipAddress, userAgent);
    }

    throw new AppError(ERROR_MESSAGES.ORDER_QR_INVALID_PURPOSE, HTTP_STATUS.BAD_REQUEST);
  }

  async _scanDriverPickup(qr, actor, ipAddress, userAgent) {
    const driverId = actor.driverId || (actor.roles?.includes('DRIVER') ? actor.id : null);
    if (!driverId) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const businessOrder = await orderRepository.findBusinessOrderById(qr.businessOrderId);
    if (!businessOrder) {
      throw new AppError(ERROR_MESSAGES.BUSINESS_ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    if (businessOrder.driverId !== driverId) {
      throw new AppError(ERROR_MESSAGES.ORDER_DRIVER_NOT_YOURS, HTTP_STATUS.FORBIDDEN);
    }
    if (!businessOrder.driverAcceptedAt) {
      throw new AppError('Accept the order before scanning pickup QR.', HTTP_STATUS.BAD_REQUEST);
    }
    if (businessOrder.status !== ORDER_STATUS.ASSIGNED) {
      throw new AppError(ERROR_MESSAGES.ORDER_INVALID_STATUS_TRANSITION, HTTP_STATUS.BAD_REQUEST);
    }

    const updatedQR = await orderQRRepository.update(qr.id, {
      status: ORDER_QR_STATUS.COMPLETED,
      scannedBy: driverId,
      scannedAt: new Date(),
    });

    const updatedBusinessOrder = await orderRepository.updateBusinessOrder(businessOrder.id, {
      status: ORDER_STATUS.PICKED_UP,
      pickedUpAt: new Date(),
    });

    const master = await orderRepository.findById(businessOrder.orderId);
    const masterStatus = this._deriveMasterStatus(
      master.businessOrders.map((bo) =>
        bo.id === businessOrder.id ? { ...bo, status: ORDER_STATUS.PICKED_UP } : bo,
      ),
    );
    await orderRepository.update(businessOrder.orderId, { status: masterStatus });

    const paymentQr = await this.createDeliveryPaymentQR(
      { ...updatedBusinessOrder, order: master, driverId },
      driverId,
    );

    await this._audit(
      driverId,
      'ORDER_QR_DRIVER_PICKUP_SCANNED',
      { orderId: businessOrder.orderId, businessOrderId: businessOrder.id, qrId: qr.qrId },
      ipAddress,
      userAgent,
    );

    await prisma.notification.create({
      data: {
        userId: master.customerId,
        title: 'Order Picked Up',
        message: `Order ${master.orderNumber} was picked up by the driver.`,
        type: 'ORDER_PICKED_UP',
        data: { orderId: master.id, businessOrderId: businessOrder.id },
      },
    }).catch(() => null);

    return {
      message: SUCCESS_MESSAGES.ORDER_QR_SCANNED,
      status: ORDER_STATUS.PICKED_UP,
      orderQr: this._payload(updatedQR),
      paymentQr,
      businessOrder: updatedBusinessOrder,
    };
  }

  async _scanPickupHandover(qr, actor, ipAddress, userAgent) {
    if (!actor.roles || !this._hasRole(actor, ADMIN_ROLES.concat(BUSINESS_ROLES))) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const businessOrder = await orderRepository.findBusinessOrderById(qr.businessOrderId);
    if (!businessOrder) {
      throw new AppError(ERROR_MESSAGES.BUSINESS_ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (
      this._hasRole(actor, [ROLES.BUSINESS_OWNER]) &&
      businessOrder.business?.ownerId !== actor.id &&
      !this._hasRole(actor, ADMIN_ROLES)
    ) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    if (
      ![ORDER_STATUS.READY, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING].includes(
        businessOrder.status,
      )
    ) {
      throw new AppError(ERROR_MESSAGES.ORDER_INVALID_STATUS_TRANSITION, HTTP_STATUS.BAD_REQUEST);
    }

    const updatedQR = await orderQRRepository.update(qr.id, {
      status: ORDER_QR_STATUS.COMPLETED,
      scannedBy: actor.id,
      scannedAt: new Date(),
    });

    const master = await orderRepository.findById(businessOrder.orderId);
    const alreadyPaid = [
      PAYMENT_STATUS.PAID,
      PAYMENT_STATUS.WALLET,
      PAYMENT_STATUS.CASH,
    ].includes(master.paymentStatus);

    const nextStatus = alreadyPaid ? ORDER_STATUS.DELIVERED : ORDER_STATUS.READY;
    const updatedBusinessOrder = await orderRepository.updateBusinessOrder(businessOrder.id, {
      status: nextStatus,
      ...(alreadyPaid ? { deliveredAt: new Date() } : { readyAt: businessOrder.readyAt || new Date() }),
    });

    const masterStatus = this._deriveMasterStatus(
      master.businessOrders.map((bo) =>
        bo.id === businessOrder.id ? { ...bo, status: nextStatus } : bo,
      ),
    );
    await orderRepository.update(businessOrder.orderId, { status: masterStatus });

    await this._audit(
      actor.id,
      'ORDER_QR_PICKUP_HANDOVER_SCANNED',
      { orderId: businessOrder.orderId, businessOrderId: businessOrder.id, qrId: qr.qrId },
      ipAddress,
      userAgent,
    );

    return {
      message: SUCCESS_MESSAGES.ORDER_QR_SCANNED,
      status: nextStatus,
      handedOver: alreadyPaid,
      awaitingPayment: !alreadyPaid,
      orderQr: this._payload(updatedQR),
      businessOrder: updatedBusinessOrder,
    };
  }

  _deriveMasterStatus(businessOrders) {
    const statuses = businessOrders.map((bo) => bo.status);
    if (statuses.every((s) => s === ORDER_STATUS.DELIVERED)) return ORDER_STATUS.DELIVERED;
    if (statuses.every((s) => s === ORDER_STATUS.CANCELLED || s === ORDER_STATUS.REJECTED)) {
      return statuses[0];
    }
    if (statuses.some((s) => s === ORDER_STATUS.ON_THE_WAY)) return ORDER_STATUS.ON_THE_WAY;
    if (statuses.some((s) => s === ORDER_STATUS.PICKED_UP)) return ORDER_STATUS.PICKED_UP;
    if (statuses.some((s) => s === ORDER_STATUS.ASSIGNED)) return ORDER_STATUS.ASSIGNED;
    if (statuses.some((s) => s === ORDER_STATUS.READY)) return ORDER_STATUS.READY;
    if (statuses.some((s) => s === ORDER_STATUS.PREPARING)) return ORDER_STATUS.PREPARING;
    if (statuses.some((s) => s === ORDER_STATUS.ACCEPTED)) return ORDER_STATUS.ACCEPTED;
    return ORDER_STATUS.PENDING;
  }

  async pay(token, data, user, ipAddress, userAgent) {
    const qr = await orderQRRepository.findByToken(token);
    await this._assertActive(qr);

    if (
      ![ORDER_QR_PURPOSE.DELIVERY_PAYMENT, ORDER_QR_PURPOSE.PICKUP_PAYMENT].includes(qr.purpose)
    ) {
      throw new AppError(ERROR_MESSAGES.ORDER_QR_INVALID_PURPOSE, HTTP_STATUS.BAD_REQUEST);
    }

    if (qr.customerId !== user.id && !this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const paymentMethod = data.paymentMethod || ORDER_PAYMENT_METHOD.CASH;
    if (
      ![ORDER_PAYMENT_METHOD.CASH, ORDER_PAYMENT_METHOD.WALLET].includes(paymentMethod)
    ) {
      throw new AppError('paymentMethod must be CASH or WALLET', HTTP_STATUS.BAD_REQUEST);
    }

    const order = await orderRepository.findById(qr.orderId);
    if (!order) throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if ([PAYMENT_STATUS.PAID, PAYMENT_STATUS.WALLET].includes(order.paymentStatus)) {
      throw new AppError(ERROR_MESSAGES.ORDER_ALREADY_PAID, HTTP_STATUS.CONFLICT);
    }

    if (paymentMethod === ORDER_PAYMENT_METHOD.WALLET) {
      if (!data.password) {
        throw new AppError(
          ERROR_MESSAGES.ORDER_QR_PAYMENT_REQUIRED_PASSWORD,
          HTTP_STATUS.BAD_REQUEST,
        );
      }
      const dbUser = await prisma.user.findFirst({ where: { id: user.id, deletedAt: null } });
      if (!dbUser) throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      const valid = await comparePassword(data.password, dbUser.password);
      if (!valid) throw new AppError(ERROR_MESSAGES.INVALID_PASSWORD, HTTP_STATUS.UNAUTHORIZED);
    }

    const payable = Number(qr.payableAmount ?? order.grandTotal);

    let paymentResult = null;
    if (paymentMethod === ORDER_PAYMENT_METHOD.WALLET) {
      paymentResult = await paymentService.createPayment(
        {
          customerId: user.id,
          businessId: qr.businessId,
          branchId: qr.branchId,
          orderId: order.id,
          paymentMethod: PAYMENT_METHOD_TYPE.WALLET,
          paymentType: 'ORDER',
          subtotal: payable,
          discount: 0,
          grandTotal: payable,
          platformFee: 0,
        },
        user.id,
        ipAddress,
        userAgent,
        user,
      );

      if (paymentResult.payment?.status !== 'SUCCESSFUL') {
        throw new AppError(
          paymentResult.payment?.failureReason || ERROR_MESSAGES.WALLET_INSUFFICIENT_BALANCE,
          HTTP_STATUS.BAD_REQUEST,
        );
      }
    } else {
      await orderRepository.update(order.id, {
        paymentMethod: ORDER_PAYMENT_METHOD.CASH,
        paymentStatus: PAYMENT_STATUS.CASH,
      });
    }

    const updatedQR = await orderQRRepository.update(qr.id, {
      status: ORDER_QR_STATUS.PAID,
      paymentMethod,
      paidById: user.id,
      paidAt: new Date(),
      paymentId: paymentResult?.payment?.paymentId || null,
    });

    // Delivery: after customer pays, mark delivered (handover complete)
    // Pickup: after customer pays, if handover already scanned → delivered; else keep ready
    let businessOrder = null;
    if (qr.businessOrderId) {
      businessOrder = await orderRepository.findBusinessOrderById(qr.businessOrderId);
    }

    if (qr.purpose === ORDER_QR_PURPOSE.DELIVERY_PAYMENT && businessOrder) {
      const updatedBO = await orderRepository.updateBusinessOrder(businessOrder.id, {
        status: ORDER_STATUS.DELIVERED,
        deliveredAt: new Date(),
      });

      if (businessOrder.driverId) {
        await prisma.driver.update({
          where: { id: businessOrder.driverId },
          data: {
            availabilityStatus: DRIVER_AVAILABILITY_STATUS.ONLINE,
            isOnline: true,
            completedDeliveries: { increment: 1 },
          },
        });
      }

      const master = await orderRepository.findById(order.id);
      const masterStatus = this._deriveMasterStatus(
        master.businessOrders.map((bo) =>
          bo.id === businessOrder.id ? { ...bo, status: ORDER_STATUS.DELIVERED } : bo,
        ),
      );
      await orderRepository.update(order.id, {
        status: masterStatus,
        paymentStatus:
          paymentMethod === ORDER_PAYMENT_METHOD.WALLET
            ? PAYMENT_STATUS.WALLET
            : PAYMENT_STATUS.CASH,
        paymentMethod,
      });

      businessOrder = updatedBO;
    }

    if (qr.purpose === ORDER_QR_PURPOSE.PICKUP_PAYMENT && businessOrder) {
      const handoverDone = await orderQRRepository.findActiveByPurpose(
        businessOrder.id,
        ORDER_QR_PURPOSE.PICKUP_HANDOVER,
      );
      // handover QR completed means status COMPLETED not in active find — check separately
      const allQrs = await orderQRRepository.findByBusinessOrderId(businessOrder.id);
      const handoverCompleted = allQrs.some(
        (q) =>
          q.purpose === ORDER_QR_PURPOSE.PICKUP_HANDOVER &&
          q.status === ORDER_QR_STATUS.COMPLETED,
      );

      await orderRepository.update(order.id, {
        paymentStatus:
          paymentMethod === ORDER_PAYMENT_METHOD.WALLET
            ? PAYMENT_STATUS.WALLET
            : PAYMENT_STATUS.CASH,
        paymentMethod,
      });

      if (handoverCompleted || businessOrder.status === ORDER_STATUS.READY) {
        businessOrder = await orderRepository.updateBusinessOrder(businessOrder.id, {
          status: ORDER_STATUS.DELIVERED,
          deliveredAt: new Date(),
        });
        const master = await orderRepository.findById(order.id);
        const masterStatus = this._deriveMasterStatus(
          master.businessOrders.map((bo) =>
            bo.id === businessOrder.id ? { ...bo, status: ORDER_STATUS.DELIVERED } : bo,
          ),
        );
        await orderRepository.update(order.id, { status: masterStatus });
      }

      // silence unused
      void handoverDone;
    }

    await this._audit(
      user.id,
      'ORDER_QR_PAID',
      {
        orderId: order.id,
        qrId: qr.qrId,
        purpose: qr.purpose,
        paymentMethod,
      },
      ipAddress,
      userAgent,
    );

    return {
      message: SUCCESS_MESSAGES.ORDER_QR_PAID,
      orderQr: this._payload(updatedQR),
      paymentMethod,
      businessOrder,
      payment: paymentResult?.payment || null,
    };
  }
}

module.exports = new OrderQRService();
