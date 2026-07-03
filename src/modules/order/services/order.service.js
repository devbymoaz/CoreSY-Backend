/**
 * Order service.
 * Multi-vendor order management for CoreSY Go.
 */

const orderRepository = require('../repositories/order.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const AppError = require('../../../utils/AppError');
const logger = require('../../../utils/logger');
const { prisma } = require('../../../prisma');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
  ORDER_STATUS,
  PRODUCT_STATUS,
  PAYMENT_STATUS,
  PERMISSION_MODULES,
  SUBSCRIPTION_TIERS,
} = require('../../../constants');

const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.SUPPORT_ADMIN, ROLES.FINANCE_ADMIN];
const BUSINESS_ROLES = [ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER];
const CANCELABLE_STATUSES = [ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED];
const PLATFORM_FEE_RATE = 0.05;
const TAX_RATE = 0;
const DEFAULT_DELIVERY_FEE = 10;
const SUBSCRIBER_DISCOUNT_RATE = 0.05;

class OrderService {
  _hasRole(user, roles) {
    return roles.some((role) => user.roles?.includes(role));
  }

  async _getOwnedBusinessIds(userId) {
    const businesses = await prisma.business.findMany({
      where: { ownerId: userId, deletedAt: null },
      select: { id: true },
    });
    return businesses.map((b) => b.id);
  }

  async _audit(userId, action, payload, ipAddress, userAgent) {
    const entry = {
      userId,
      action,
      module: PERMISSION_MODULES.ORDERS,
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
      logger.error('Failed to create order notification:', error);
    }
  }

  async _generateOrderNumber() {
    const date = new Date();
    const prefix = `ORD-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const latest = await orderRepository.findLatestOrderNumber(prefix);
    let sequence = 1;
    if (latest?.orderNumber) {
      const match = latest.orderNumber.match(/(\d+)$/);
      if (match) sequence = parseInt(match[1], 10) + 1;
    }
    return `${prefix}-${String(sequence).padStart(6, '0')}`;
  }

  _buildInvoice(order) {
    return {
      invoiceNumber: order.invoiceNumber,
      orderNumber: order.orderNumber,
      issuedAt: new Date().toISOString(),
      customer: {
        id: order.customer?.id,
        name: order.customer?.fullName,
        email: order.customer?.email,
        phone: order.customer?.phoneNumber,
      },
      deliveryAddress: order.deliveryAddress,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      items: (order.items || []).map((item) => ({
        productName: item.productName,
        productSku: item.productSku,
        businessId: item.businessId,
        branchId: item.branchId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        subtotal: Number(item.subtotal),
      })),
      businessOrders: (order.businessOrders || []).map((bo) => ({
        businessOrderNumber: bo.businessOrderNumber,
        businessName: bo.business?.name,
        branchName: bo.branch?.name,
        status: bo.status,
        subtotal: Number(bo.subtotal),
        discount: Number(bo.discount),
        total: Number(bo.total),
      })),
      totals: {
        totalAmount: Number(order.totalAmount),
        discount: Number(order.discount),
        subscriberDiscount: Number(order.subscriberDiscount),
        platformFee: Number(order.platformFee),
        deliveryFee: Number(order.deliveryFee),
        tax: Number(order.tax),
        grandTotal: Number(order.grandTotal),
      },
    };
  }

  _unitPrice(product, isSubscriber) {
    if (isSubscriber && product.subscriberPrice != null) {
      return Number(product.subscriberPrice);
    }
    if (product.discountPrice != null) {
      return Number(product.discountPrice);
    }
    return Number(product.basePrice);
  }

  _deriveMasterStatus(businessOrders) {
    const statuses = businessOrders.map((bo) => bo.status);
    if (statuses.every((s) => s === ORDER_STATUS.DELIVERED)) return ORDER_STATUS.DELIVERED;
    if (statuses.every((s) => s === ORDER_STATUS.CANCELLED)) return ORDER_STATUS.CANCELLED;
    if (statuses.every((s) => s === ORDER_STATUS.REJECTED)) return ORDER_STATUS.REJECTED;
    if (statuses.every((s) => s === ORDER_STATUS.REFUNDED)) return ORDER_STATUS.REFUNDED;
    if (statuses.some((s) => s === ORDER_STATUS.ON_THE_WAY)) return ORDER_STATUS.ON_THE_WAY;
    if (statuses.some((s) => s === ORDER_STATUS.PICKED_UP)) return ORDER_STATUS.PICKED_UP;
    if (statuses.some((s) => s === ORDER_STATUS.ASSIGNED)) return ORDER_STATUS.ASSIGNED;
    if (statuses.some((s) => s === ORDER_STATUS.READY)) return ORDER_STATUS.READY;
    if (statuses.some((s) => s === ORDER_STATUS.PREPARING)) return ORDER_STATUS.PREPARING;
    if (statuses.some((s) => s === ORDER_STATUS.ACCEPTED)) return ORDER_STATUS.ACCEPTED;
    if (statuses.some((s) => s === ORDER_STATUS.PENDING)) return ORDER_STATUS.PENDING;
    return ORDER_STATUS.PENDING;
  }

  async _assertOrderAccess(order, user, { write = false } = {}) {
    if (this._hasRole(user, ADMIN_ROLES)) return;

    if (order.customerId === user.id) {
      if (write && !['cancel', 'reorder'].includes(write)) return;
      return;
    }

    if (this._hasRole(user, BUSINESS_ROLES)) {
      const ownedIds = this._hasRole(user, [ROLES.BUSINESS_OWNER])
        ? await this._getOwnedBusinessIds(user.id)
        : null;

      const hasBusiness = order.businessOrders?.some((bo) => {
        if (this._hasRole(user, [ROLES.BUSINESS_MANAGER])) return true;
        return ownedIds?.includes(bo.businessId);
      });

      if (hasBusiness) return;
    }

    throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
  }

  async createOrder(data, userId, ipAddress, userAgent, user) {
    if (!this._hasRole(user, [ROLES.USER, ROLES.SUPER_ADMIN])) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const customerId = data.customerId || userId;
    if (customerId !== userId && !this._hasRole(user, [ROLES.SUPER_ADMIN])) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const customer = await prisma.user.findFirst({
      where: { id: customerId, deletedAt: null },
    });
    if (!customer) throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const governorate = await prisma.governorate.findUnique({
      where: { id: data.deliveryAddress.governorateId },
    });
    if (!governorate) {
      throw new AppError(ERROR_MESSAGES.GOVERNORATE_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
    }

    const productIds = data.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        deletedAt: null,
        status: { not: PRODUCT_STATUS.DELETED },
      },
      include: {
        business: { select: { id: true, name: true, ownerId: true, status: true } },
        branch: { select: { id: true, name: true, businessId: true, status: true } },
      },
    });

    if (products.length !== productIds.length) {
      throw new AppError(ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const isSubscriber = customer.subscription !== SUBSCRIPTION_TIERS.FREE;
    const grouped = new Map();

    for (const item of data.items) {
      const product = productMap.get(item.productId);
      if (!product || product.status !== PRODUCT_STATUS.ACTIVE) {
        throw new AppError(ERROR_MESSAGES.ORDER_PRODUCT_INACTIVE, HTTP_STATUS.BAD_REQUEST);
      }

      if (!product.unlimitedStock && product.stockQuantity < item.quantity) {
        throw new AppError(
          `${ERROR_MESSAGES.ORDER_INSUFFICIENT_STOCK}: ${product.name}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      const unitPrice = this._unitPrice(product, isSubscriber);
      const lineDiscount = Math.max(0, Number(product.basePrice) - unitPrice) * item.quantity;
      const subtotal = unitPrice * item.quantity;
      const key = `${product.businessId}:${product.branchId}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          businessId: product.businessId,
          branchId: product.branchId,
          business: product.business,
          items: [],
          subtotal: 0,
          discount: 0,
        });
      }

      const group = grouped.get(key);
      group.items.push({
        productId: product.id,
        businessId: product.businessId,
        branchId: product.branchId,
        productName: product.name,
        productSku: product.sku,
        productCode: product.code,
        quantity: item.quantity,
        unitPrice,
        discount: lineDiscount,
        subtotal,
        product,
      });
      group.subtotal += subtotal;
      group.discount += lineDiscount;
    }

    const totalAmount = [...grouped.values()].reduce((sum, g) => sum + g.subtotal + g.discount, 0);
    const discount = [...grouped.values()].reduce((sum, g) => sum + g.discount, 0);
    const subscriberDiscount = isSubscriber
      ? Number(
          (
            [...grouped.values()].reduce((sum, g) => sum + g.subtotal, 0) * SUBSCRIBER_DISCOUNT_RATE
          ).toFixed(2),
        )
      : 0;
    const itemsSubtotal = [...grouped.values()].reduce((sum, g) => sum + g.subtotal, 0);
    const platformFee = Number((itemsSubtotal * PLATFORM_FEE_RATE).toFixed(2));
    const deliveryFee =
      data.deliveryFee != null ? Number(data.deliveryFee) : DEFAULT_DELIVERY_FEE * grouped.size;
    const tax = Number(((itemsSubtotal + platformFee + deliveryFee) * TAX_RATE).toFixed(2));
    const grandTotal = Number(
      (itemsSubtotal - subscriberDiscount + platformFee + deliveryFee + tax).toFixed(2),
    );

    const orderNumber = await this._generateOrderNumber();
    const invoiceNumber = `INV-${orderNumber.replace('ORD-', '')}`;
    const estimatedDeliveryTime = new Date(Date.now() + 60 * 60 * 1000);
    const paymentStatus =
      data.paymentMethod === 'CASH'
        ? PAYMENT_STATUS.CASH
        : data.paymentMethod === 'WALLET'
          ? PAYMENT_STATUS.WALLET
          : PAYMENT_STATUS.PENDING;

    const order = await prisma.$transaction(async (tx) => {
      for (const group of grouped.values()) {
        for (const item of group.items) {
          if (!item.product.unlimitedStock) {
            const updated = await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: { decrement: item.quantity },
              },
            });

            if (updated.stockQuantity < 0) {
              throw new AppError(
                `${ERROR_MESSAGES.ORDER_INSUFFICIENT_STOCK}: ${item.productName}`,
                HTTP_STATUS.BAD_REQUEST,
              );
            }

            const newStatus =
              updated.stockQuantity <= 0 ? PRODUCT_STATUS.OUT_OF_STOCK : updated.status;

            if (newStatus !== updated.status) {
              await tx.product.update({
                where: { id: item.productId },
                data: { status: newStatus },
              });
            }

            await tx.productInventoryLog.create({
              data: {
                productId: item.productId,
                previousStock: updated.stockQuantity + item.quantity,
                newStock: updated.stockQuantity,
                changeAmount: -item.quantity,
                reason: `Order ${orderNumber}`,
                createdBy: userId,
              },
            });
          }
        }
      }

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          paymentMethod: data.paymentMethod,
          paymentStatus,
          status: ORDER_STATUS.PENDING,
          totalAmount,
          discount,
          subscriberDiscount,
          platformFee,
          deliveryFee,
          tax,
          grandTotal,
          estimatedDeliveryTime,
          deliveryNotes: data.deliveryNotes || data.deliveryAddress.deliveryNotes || null,
          invoiceNumber,
          createdBy: userId,
          deliveryAddress: {
            create: {
              customerName: data.deliveryAddress.customerName,
              phone: data.deliveryAddress.phone,
              governorateId: data.deliveryAddress.governorateId,
              area: data.deliveryAddress.area,
              street: data.deliveryAddress.street,
              building: data.deliveryAddress.building || null,
              floor: data.deliveryAddress.floor || null,
              apartment: data.deliveryAddress.apartment || null,
              latitude: data.deliveryAddress.latitude ?? null,
              longitude: data.deliveryAddress.longitude ?? null,
              deliveryNotes: data.deliveryAddress.deliveryNotes || null,
            },
          },
        },
      });

      let businessIndex = 1;
      for (const group of grouped.values()) {
        const businessOrder = await tx.businessOrder.create({
          data: {
            businessOrderNumber: `${orderNumber}-B${businessIndex}`,
            orderId: createdOrder.id,
            businessId: group.businessId,
            branchId: group.branchId,
            status: ORDER_STATUS.PENDING,
            subtotal: group.subtotal,
            discount: group.discount,
            total: group.subtotal,
          },
        });

        await tx.orderItem.createMany({
          data: group.items.map((item) => ({
            orderId: createdOrder.id,
            businessOrderId: businessOrder.id,
            productId: item.productId,
            businessId: item.businessId,
            branchId: item.branchId,
            productName: item.productName,
            productSku: item.productSku,
            productCode: item.productCode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            subtotal: item.subtotal,
          })),
        });

        businessIndex += 1;
      }

      const fullOrder = await tx.order.findUnique({
        where: { id: createdOrder.id },
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
              subscription: true,
            },
          },
          deliveryAddress: { include: { governorate: true } },
          businessOrders: {
            include: {
              business: { select: { id: true, name: true, ownerId: true } },
              branch: { select: { id: true, name: true, code: true } },
              items: true,
            },
          },
          items: true,
        },
      });

      const invoiceData = this._buildInvoice(fullOrder);
      return tx.order.update({
        where: { id: fullOrder.id },
        data: { invoiceData },
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
              subscription: true,
            },
          },
          deliveryAddress: { include: { governorate: true } },
          businessOrders: {
            include: {
              business: { select: { id: true, name: true, ownerId: true } },
              branch: { select: { id: true, name: true, code: true } },
              items: {
                include: {
                  product: { select: { id: true, name: true, sku: true, images: true } },
                },
              },
            },
          },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, images: true } },
              business: { select: { id: true, name: true } },
              branch: { select: { id: true, name: true } },
            },
          },
        },
      });
    });

    await this._audit(
      userId,
      'ORDER_CREATED',
      { orderId: order.id, orderNumber: order.orderNumber },
      ipAddress,
      userAgent,
    );

    await this._notify(
      customerId,
      'Order Confirmed',
      `Your order ${order.orderNumber} has been placed successfully.`,
      'ORDER_CONFIRMED',
      { orderId: order.id },
    );

    for (const businessOrder of order.businessOrders) {
      if (businessOrder.business?.ownerId) {
        await this._notify(
          businessOrder.business.ownerId,
          'New Order',
          `New order ${businessOrder.businessOrderNumber} received.`,
          'NEW_ORDER',
          { orderId: order.id, businessOrderId: businessOrder.id },
        );
      }
    }

    return { message: SUCCESS_MESSAGES.ORDER_CREATED, order };
  }

  async getOrders(query, user) {
    const filters = { ...query };

    if (
      this._hasRole(user, [ROLES.USER]) &&
      !this._hasRole(user, ADMIN_ROLES.concat(BUSINESS_ROLES))
    ) {
      filters.customerId = user.id;
    } else if (
      this._hasRole(user, [ROLES.BUSINESS_OWNER]) &&
      !this._hasRole(user, [ROLES.SUPER_ADMIN])
    ) {
      filters.businessIds = await this._getOwnedBusinessIds(user.id);
    }

    return orderRepository.findAll(filters);
  }

  async getOrderHistory(query, user) {
    return this.getOrders({ ...query, historyOnly: true }, user);
  }

  async getOrderById(id, user) {
    const order = await orderRepository.findById(id);
    if (!order) throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    await this._assertOrderAccess(order, user);
    return order;
  }

  async trackOrder(id, user) {
    const order = await this.getOrderById(id, user);
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      businessOrders: order.businessOrders.map((bo) => ({
        id: bo.id,
        businessOrderNumber: bo.businessOrderNumber,
        businessName: bo.business?.name,
        branchName: bo.branch?.name,
        status: bo.status,
        acceptedAt: bo.acceptedAt,
        preparingAt: bo.preparingAt,
        readyAt: bo.readyAt,
        deliveredAt: bo.deliveredAt,
      })),
    };
  }

  async getInvoice(id, user) {
    const order = await this.getOrderById(id, user);
    const invoice = order.invoiceData || this._buildInvoice(order);
    return { message: SUCCESS_MESSAGES.ORDER_INVOICE_GENERATED, invoice };
  }

  async cancelOrder(id, reason, userId, ipAddress, userAgent, user) {
    const order = await orderRepository.findById(id);
    if (!order) throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const isCustomer = order.customerId === user.id;
    const isAdmin = this._hasRole(user, [ROLES.SUPER_ADMIN]);
    if (!isCustomer && !isAdmin) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    if (order.status === ORDER_STATUS.CANCELLED) {
      throw new AppError(ERROR_MESSAGES.ORDER_ALREADY_CANCELLED, HTTP_STATUS.BAD_REQUEST);
    }

    if (!CANCELABLE_STATUSES.includes(order.status) && !isAdmin) {
      throw new AppError(ERROR_MESSAGES.ORDER_CANNOT_BE_CANCELLED, HTTP_STATUS.BAD_REQUEST);
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product && !product.unlimitedStock) {
          const restored = await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: { increment: item.quantity },
              status:
                product.status === PRODUCT_STATUS.OUT_OF_STOCK
                  ? PRODUCT_STATUS.ACTIVE
                  : product.status,
            },
          });

          await tx.productInventoryLog.create({
            data: {
              productId: item.productId,
              previousStock: restored.stockQuantity - item.quantity,
              newStock: restored.stockQuantity,
              changeAmount: item.quantity,
              reason: `Order cancelled ${order.orderNumber}`,
              createdBy: userId,
            },
          });
        }
      }

      await tx.businessOrder.updateMany({
        where: {
          orderId: id,
          status: { in: CANCELABLE_STATUSES },
        },
        data: {
          status: ORDER_STATUS.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      return tx.order.update({
        where: { id },
        data: {
          status: ORDER_STATUS.CANCELLED,
          cancellationReason: reason || null,
          paymentStatus:
            order.paymentStatus === PAYMENT_STATUS.PAID
              ? PAYMENT_STATUS.REFUNDED
              : order.paymentStatus,
          updatedBy: userId,
        },
        include: {
          customer: {
            select: { id: true, fullName: true, email: true, phoneNumber: true },
          },
          businessOrders: {
            include: {
              business: { select: { id: true, name: true, ownerId: true } },
            },
          },
          items: true,
          deliveryAddress: { include: { governorate: true } },
        },
      });
    });

    await this._audit(userId, 'ORDER_CANCELLED', { orderId: id, reason }, ipAddress, userAgent);

    await this._notify(
      order.customerId,
      'Order Cancelled',
      `Your order ${order.orderNumber} has been cancelled.`,
      'ORDER_CANCELLED',
      { orderId: id },
    );

    for (const businessOrder of order.businessOrders) {
      if (businessOrder.business?.ownerId) {
        await this._notify(
          businessOrder.business.ownerId,
          'Order Cancelled',
          `Order ${businessOrder.businessOrderNumber} was cancelled.`,
          'ORDER_CANCELLED',
          { orderId: id, businessOrderId: businessOrder.id },
        );
      }
    }

    return { message: SUCCESS_MESSAGES.ORDER_CANCELLED, order: updated };
  }

  async reorder(id, userId, ipAddress, userAgent, user) {
    const order = await orderRepository.findById(id);
    if (!order) throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (order.customerId !== user.id && !this._hasRole(user, [ROLES.SUPER_ADMIN])) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const payload = {
      paymentMethod: order.paymentMethod,
      deliveryNotes: order.deliveryNotes,
      deliveryAddress: {
        customerName: order.deliveryAddress.customerName,
        phone: order.deliveryAddress.phone,
        governorateId: order.deliveryAddress.governorateId,
        area: order.deliveryAddress.area,
        street: order.deliveryAddress.street,
        building: order.deliveryAddress.building,
        floor: order.deliveryAddress.floor,
        apartment: order.deliveryAddress.apartment,
        latitude: order.deliveryAddress.latitude ? Number(order.deliveryAddress.latitude) : null,
        longitude: order.deliveryAddress.longitude ? Number(order.deliveryAddress.longitude) : null,
        deliveryNotes: order.deliveryAddress.deliveryNotes,
      },
      items: order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    };

    const result = await this.createOrder(payload, userId, ipAddress, userAgent, user);
    return { message: SUCCESS_MESSAGES.ORDER_REORDERED, order: result.order };
  }

  async getBusinessOrders(query, user) {
    const filters = { ...query };

    if (this._hasRole(user, [ROLES.BUSINESS_OWNER]) && !this._hasRole(user, [ROLES.SUPER_ADMIN])) {
      filters.businessIds = await this._getOwnedBusinessIds(user.id);
    } else if (
      !this._hasRole(user, ADMIN_ROLES.concat([ROLES.BUSINESS_MANAGER, ROLES.BUSINESS_OWNER]))
    ) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    return orderRepository.findBusinessOrders(filters);
  }

  async getTodayBusinessOrders(query, user) {
    return this.getBusinessOrders({ ...query, todayOnly: true }, user);
  }

  async _assertBusinessOrderAccess(businessOrder, user) {
    if (this._hasRole(user, ADMIN_ROLES)) return;
    if (this._hasRole(user, [ROLES.BUSINESS_MANAGER])) return;

    if (this._hasRole(user, [ROLES.BUSINESS_OWNER])) {
      if (businessOrder.business.ownerId === user.id) return;
    }

    throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
  }

  async _updateBusinessOrderStatus(
    businessOrderId,
    nextStatus,
    userId,
    ipAddress,
    userAgent,
    user,
    extra = {},
  ) {
    const businessOrder = await orderRepository.findBusinessOrderById(businessOrderId);
    if (!businessOrder) {
      throw new AppError(ERROR_MESSAGES.BUSINESS_ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    await this._assertBusinessOrderAccess(businessOrder, user);

    const transitions = {
      [ORDER_STATUS.ACCEPTED]: [ORDER_STATUS.PENDING],
      [ORDER_STATUS.REJECTED]: [ORDER_STATUS.PENDING],
      [ORDER_STATUS.PREPARING]: [ORDER_STATUS.ACCEPTED],
      [ORDER_STATUS.READY]: [ORDER_STATUS.PREPARING],
    };

    const allowedFrom = transitions[nextStatus] || [];
    if (allowedFrom.length && !allowedFrom.includes(businessOrder.status)) {
      throw new AppError(ERROR_MESSAGES.ORDER_INVALID_STATUS_TRANSITION, HTTP_STATUS.BAD_REQUEST);
    }

    const timestamps = {};
    if (nextStatus === ORDER_STATUS.ACCEPTED) timestamps.acceptedAt = new Date();
    if (nextStatus === ORDER_STATUS.PREPARING) timestamps.preparingAt = new Date();
    if (nextStatus === ORDER_STATUS.READY) timestamps.readyAt = new Date();
    if (nextStatus === ORDER_STATUS.REJECTED) timestamps.cancelledAt = new Date();

    const updatedBusinessOrder = await orderRepository.updateBusinessOrder(businessOrderId, {
      status: nextStatus,
      ...timestamps,
      ...extra,
    });

    const master = await orderRepository.findById(businessOrder.orderId);
    const masterStatus = this._deriveMasterStatus(
      master.businessOrders.map((bo) =>
        bo.id === businessOrderId ? { ...bo, status: nextStatus } : bo,
      ),
    );

    const updatedOrder = await orderRepository.update(businessOrder.orderId, {
      status: masterStatus,
      updatedBy: userId,
      invoiceData: this._buildInvoice({
        ...master,
        status: masterStatus,
        businessOrders: master.businessOrders.map((bo) =>
          bo.id === businessOrderId ? { ...bo, status: nextStatus } : bo,
        ),
      }),
    });

    await this._audit(
      userId,
      'ORDER_STATUS_CHANGED',
      {
        orderId: businessOrder.orderId,
        businessOrderId,
        previousStatus: businessOrder.status,
        status: nextStatus,
      },
      ipAddress,
      userAgent,
    );

    const customerMessages = {
      [ORDER_STATUS.ACCEPTED]: 'Order Accepted',
      [ORDER_STATUS.PREPARING]: 'Order Preparing',
      [ORDER_STATUS.READY]: 'Order Ready',
      [ORDER_STATUS.REJECTED]: 'Order Rejected',
    };

    if (customerMessages[nextStatus]) {
      await this._notify(
        master.customerId,
        customerMessages[nextStatus],
        `Order ${master.orderNumber} is now ${nextStatus.toLowerCase().replaceAll('_', ' ')}.`,
        `ORDER_${nextStatus}`,
        { orderId: master.id, businessOrderId },
      );
    }

    return {
      message: SUCCESS_MESSAGES[`ORDER_${nextStatus}`] || SUCCESS_MESSAGES.ORDER_STATUS_UPDATED,
      businessOrder: updatedBusinessOrder,
      order: updatedOrder,
    };
  }

  async acceptBusinessOrder(id, userId, ipAddress, userAgent, user) {
    return this._updateBusinessOrderStatus(
      id,
      ORDER_STATUS.ACCEPTED,
      userId,
      ipAddress,
      userAgent,
      user,
    );
  }

  async rejectBusinessOrder(id, reason, userId, ipAddress, userAgent, user) {
    const businessOrder = await orderRepository.findBusinessOrderById(id);
    if (!businessOrder) {
      throw new AppError(ERROR_MESSAGES.BUSINESS_ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const result = await this._updateBusinessOrderStatus(
      id,
      ORDER_STATUS.REJECTED,
      userId,
      ipAddress,
      userAgent,
      user,
      { rejectionReason: reason || null },
    );

    await prisma.$transaction(async (tx) => {
      for (const item of businessOrder.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product && !product.unlimitedStock) {
          const restored = await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: { increment: item.quantity },
              status:
                product.status === PRODUCT_STATUS.OUT_OF_STOCK
                  ? PRODUCT_STATUS.ACTIVE
                  : product.status,
            },
          });

          await tx.productInventoryLog.create({
            data: {
              productId: item.productId,
              previousStock: restored.stockQuantity - item.quantity,
              newStock: restored.stockQuantity,
              changeAmount: item.quantity,
              reason: `Business order rejected ${businessOrder.businessOrderNumber}`,
              createdBy: userId,
            },
          });
        }
      }
    });

    return result;
  }

  async preparingBusinessOrder(id, userId, ipAddress, userAgent, user) {
    return this._updateBusinessOrderStatus(
      id,
      ORDER_STATUS.PREPARING,
      userId,
      ipAddress,
      userAgent,
      user,
    );
  }

  async readyBusinessOrder(id, userId, ipAddress, userAgent, user) {
    return this._updateBusinessOrderStatus(
      id,
      ORDER_STATUS.READY,
      userId,
      ipAddress,
      userAgent,
      user,
    );
  }

  async getCustomerDashboard(user) {
    return orderRepository.getCustomerDashboard(user.id);
  }

  async getBusinessDashboard(query, user) {
    const filters = { ...query };

    if (this._hasRole(user, [ROLES.BUSINESS_OWNER]) && !this._hasRole(user, [ROLES.SUPER_ADMIN])) {
      filters.businessIds = await this._getOwnedBusinessIds(user.id);
    } else if (!this._hasRole(user, ADMIN_ROLES.concat(BUSINESS_ROLES))) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    return orderRepository.getBusinessDashboard(filters);
  }
}

module.exports = new OrderService();
