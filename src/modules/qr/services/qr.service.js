const qrRepository = require('../repositories/qr.repository');
const paymentQRRepository = require('../repositories/payment-qr.repository');
const bookingRepository = require('../../booking/repositories/booking.repository');
const paymentService = require('../../payment/services/payment.service');
const auditLogService = require('../../rbac/services/audit-log.service');
const AppError = require('../../../utils/AppError');
const { comparePassword } = require('../../../utils/password');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  QR_STATUS,
  BOOKING_STATUS,
  ROLES,
  PAYMENT_QR_STATUS,
  PAYMENT_METHOD_TYPE,
} = require('../../../constants');
const { prisma } = require('../../../prisma');
const crypto = require('crypto');

function generateQrId() {
  return `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function calculateExpiry(bookingDate, slotTime) {
  const [hours, minutes] = slotTime.split(':').map(Number);
  const expiry = new Date(bookingDate);
  expiry.setHours(hours + 2, minutes); // Expire 2 hours after slot start
  return expiry;
}

class QRService {
  async generateQR(bookingId, userId, user) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new AppError(ERROR_MESSAGES.BOOKING_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    // Check if QR already exists
    const existingQR = await qrRepository.findByBookingId(bookingId);
    if (existingQR) throw new AppError(ERROR_MESSAGES.QR_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);

    // Check booking status
    if (booking.status !== BOOKING_STATUS.CONFIRMED) {
      throw new AppError(ERROR_MESSAGES.INVALID_BOOKING_STATUS, HTTP_STATUS.BAD_REQUEST);
    }

    const qrId = generateQrId();
    const token = generateToken();
    const expiryTime = calculateExpiry(booking.reservationDate, booking.startTime);

    const qrCode = await qrRepository.create({
      qrId,
      token,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      customerId: booking.customerId,
      customerName: booking.customer.fullName,
      businessId: booking.businessId,
      branchId: booking.branchId,
      serviceId: booking.serviceId,
      bookingType: booking.bookingType,
      bookingDate: booking.reservationDate,
      slotTime: booking.startTime,
      status: QR_STATUS.ACTIVE,
      expiryTime,
    });

    await auditLogService.create({
      userId,
      action: 'QR_GENERATED',
      module: 'QR',
      payload: { qrId: qrCode.qrId, bookingId },
    });

    return { message: SUCCESS_MESSAGES.QR_CODE_GENERATED, qrCode };
  }

  async getQRByBookingId(bookingId, user) {
    const qrCode = await qrRepository.findByBookingId(bookingId);
    if (!qrCode) throw new AppError(ERROR_MESSAGES.QR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    await this._validateAccess(qrCode, user);

    return { qrCode };
  }

  async getQRByQrId(qrId, user) {
    const qrCode = await qrRepository.findByQrId(qrId);
    if (!qrCode) throw new AppError(ERROR_MESSAGES.QR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    await this._validateAccess(qrCode, user);

    return { qrCode };
  }

  async validateQR(token, user) {
    const qrCode = await qrRepository.findByToken(token);
    if (!qrCode) throw new AppError(ERROR_MESSAGES.QR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    await this._validateQRStatus(qrCode);
    await this._validateCashierAccess(qrCode, user);

    return { message: SUCCESS_MESSAGES.QR_VALIDATED, qrCode, isValid: true };
  }

  async scanQR(token, userId, ipAddress, userAgent, user) {
    return prisma.$transaction(async (tx) => {
      const qrCode = await tx.qRCode.findUnique({
        where: { token },
        include: { booking: true },
      });
      if (!qrCode) throw new AppError(ERROR_MESSAGES.QR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

      await this._validateQRStatus(qrCode);
      await this._validateCashierAccess(qrCode, user);

      const updatedQR = await tx.qRCode.update({
        where: { id: qrCode.id },
        data: {
          status: QR_STATUS.SCANNED,
          scannedAt: new Date(),
          scannedBy: user.id,
        },
        include: { booking: true, customer: true, business: true, branch: true, service: true },
      });

      await tx.booking.update({
        where: { id: qrCode.bookingId },
        data: { status: BOOKING_STATUS.CHECKED_IN },
      });

      await auditLogService.create({
        userId,
        action: 'QR_SCANNED',
        module: 'QR',
        ipAddress,
        userAgent,
        payload: { qrId: qrCode.qrId, bookingId: qrCode.bookingId },
      });

      return { message: SUCCESS_MESSAGES.QR_SCANNED, qrCode: updatedQR };
    });
  }

  async checkIn(qrId, userId, ipAddress, userAgent, user) {
    return prisma.$transaction(async (tx) => {
      const qrCode = await tx.qRCode.findUnique({
        where: { qrId },
        include: { booking: true },
      });
      if (!qrCode) throw new AppError(ERROR_MESSAGES.QR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

      await this._validateCashierAccess(qrCode, user);

      if (qrCode.status !== QR_STATUS.ACTIVE && qrCode.status !== QR_STATUS.GENERATED) {
        throw new AppError(ERROR_MESSAGES.QR_NOT_ACTIVE, HTTP_STATUS.BAD_REQUEST);
      }

      const updatedQR = await tx.qRCode.update({
        where: { id: qrCode.id },
        data: {
          status: QR_STATUS.SCANNED,
          scannedAt: new Date(),
          checkedInAt: new Date(),
          scannedBy: user.id,
        },
        include: { booking: true, customer: true, business: true, branch: true, service: true },
      });

      await tx.booking.update({
        where: { id: qrCode.bookingId },
        data: { 
          status: BOOKING_STATUS.CHECKED_IN,
          checkInTime: new Date(),
        },
      });

      await auditLogService.create({
        userId,
        action: 'QR_CHECKED_IN',
        module: 'QR',
        ipAddress,
        userAgent,
        payload: { qrId: qrCode.qrId, bookingId: qrCode.bookingId },
      });

      return { message: SUCCESS_MESSAGES.QR_CHECKED_IN, qrCode: updatedQR };
    });
  }

  async checkOut(qrId, userId, ipAddress, userAgent, user) {
    return prisma.$transaction(async (tx) => {
      const qrCode = await tx.qRCode.findUnique({
        where: { qrId },
        include: { booking: true },
      });
      if (!qrCode) throw new AppError(ERROR_MESSAGES.QR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

      await this._validateCashierAccess(qrCode, user);

      if (qrCode.status !== QR_STATUS.SCANNED) {
        throw new AppError(ERROR_MESSAGES.INVALID_BOOKING_STATUS, HTTP_STATUS.BAD_REQUEST);
      }

      const updatedQR = await tx.qRCode.update({
        where: { id: qrCode.id },
        data: {
          status: QR_STATUS.COMPLETED,
          checkedOutAt: new Date(),
        },
        include: { booking: true, customer: true, business: true, branch: true, service: true },
      });

      await tx.booking.update({
        where: { id: qrCode.bookingId },
        data: { 
          status: BOOKING_STATUS.COMPLETED,
          checkOutTime: new Date(),
        },
      });

      await auditLogService.create({
        userId,
        action: 'QR_CHECKED_OUT',
        module: 'QR',
        ipAddress,
        userAgent,
        payload: { qrId: qrCode.qrId, bookingId: qrCode.bookingId },
      });

      try {
        await prisma.notification.create({
          data: {
            userId: qrCode.customerId,
            title: 'Rate your visit',
            message: 'Your booking is complete. Please rate and review the branch.',
            type: 'REVIEW_REQUEST',
            module: 'Reviews',
            referenceId: qrCode.bookingId,
            data: {
              bookingId: qrCode.bookingId,
              branchId: qrCode.branchId,
              businessId: qrCode.businessId,
            },
          },
        });
      } catch (_e) {
        // non-blocking
      }

      return { message: SUCCESS_MESSAGES.QR_CHECKED_OUT, qrCode: updatedQR };
    });
  }

  async cancelQR(qrId, userId, ipAddress, userAgent, user) {
    return prisma.$transaction(async (tx) => {
      const qrCode = await tx.qRCode.findUnique({
        where: { qrId },
        include: { booking: true },
      });
      if (!qrCode) throw new AppError(ERROR_MESSAGES.QR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

      await this._validateAccess(qrCode, user);

      if (qrCode.status === QR_STATUS.COMPLETED || qrCode.status === QR_STATUS.CANCELLED) {
        throw new AppError(ERROR_MESSAGES.BOOKING_CANNOT_BE_CANCELLED, HTTP_STATUS.BAD_REQUEST);
      }

      const updatedQR = await tx.qRCode.update({
        where: { id: qrCode.id },
        data: { status: QR_STATUS.CANCELLED },
        include: { booking: true, customer: true, business: true, branch: true, service: true },
      });

      await tx.booking.update({
        where: { id: qrCode.bookingId },
        data: { status: BOOKING_STATUS.CANCELLED },
      });

      await auditLogService.create({
        userId,
        action: 'QR_CANCELLED',
        module: 'QR',
        ipAddress,
        userAgent,
        payload: { qrId: qrCode.qrId, bookingId: qrCode.bookingId },
      });

      return { message: SUCCESS_MESSAGES.QR_CANCELLED, qrCode: updatedQR };
    });
  }

  async getAllQRs(query, user) {
    const where = { ...query };

    // Apply access control
    if (user.roles.includes(ROLES.USER)) {
      where.customerId = user.id;
    } else if (user.roles.includes(ROLES.BUSINESS_OWNER)) {
      const businesses = await prisma.business.findMany({
        where: { ownerId: user.id },
        select: { id: true },
      });
      where.businessId = { in: businesses.map(b => b.id) };
    } else if (user.roles.includes(ROLES.BUSINESS_MANAGER) || user.roles.includes(ROLES.CASHIER)) {
      const cashier = await prisma.cashier.findUnique({ where: { id: user.id } });
      if (cashier) {
        where.branchId = cashier.branchId;
      }
    }

    return qrRepository.findAll(where);
  }

  async getCustomerDashboard(userId) {
    return qrRepository.getCustomerDashboardStats(userId);
  }

  async getBusinessDashboard(businessId, user) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    return qrRepository.getBusinessDashboardStats(businessId);
  }

  async getCashierDashboard(userId) {
    const cashier = await prisma.cashier.findUnique({ where: { id: userId } });
    if (!cashier) throw new AppError(ERROR_MESSAGES.CASHIER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    
    return qrRepository.getCashierDashboardStats(userId, cashier.branchId);
  }

  async _validateAccess(qrCode, user) {
    const isCustomer = qrCode.customerId === user.id;
    const isBusinessOwner = qrCode.business.ownerId === user.id;
    const isCashier = await prisma.cashier.findUnique({
      where: { id: user.id, branchId: qrCode.branchId },
    });
    const isAdmin = user.roles.includes(ROLES.SUPER_ADMIN) || 
                   user.roles.includes(ROLES.FINANCE_ADMIN) || 
                   user.roles.includes(ROLES.SUPPORT_ADMIN);

    if (!isCustomer && !isBusinessOwner && !isCashier && !isAdmin) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
  }

  async _validateCashierAccess(qrCode, user) {
    const isBusinessOwner = qrCode.business.ownerId === user.id;
    const isCashier = await prisma.cashier.findUnique({
      where: { id: user.id, branchId: qrCode.branchId },
    });
    const isAdmin = user.roles.includes(ROLES.SUPER_ADMIN);

    if (!isBusinessOwner && !isCashier && !isAdmin) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
  }

  async _validateQRStatus(qrCode) {
    if (qrCode.status === QR_STATUS.EXPIRED) {
      throw new AppError(ERROR_MESSAGES.QR_EXPIRED, HTTP_STATUS.BAD_REQUEST);
    }
    if (qrCode.status === QR_STATUS.CANCELLED) {
      throw new AppError(ERROR_MESSAGES.QR_CANCELLED, HTTP_STATUS.BAD_REQUEST);
    }
    if (qrCode.status === QR_STATUS.COMPLETED) {
      throw new AppError(ERROR_MESSAGES.QR_ALREADY_SCANNED, HTTP_STATUS.BAD_REQUEST);
    }
    if (qrCode.status === QR_STATUS.SCANNED) {
      throw new AppError(ERROR_MESSAGES.QR_ALREADY_SCANNED, HTTP_STATUS.BAD_REQUEST);
    }

    // Check if QR has expired based on time
    if (new Date() > new Date(qrCode.expiryTime)) {
      throw new AppError(ERROR_MESSAGES.QR_EXPIRED, HTTP_STATUS.BAD_REQUEST);
    }
  }

  _computePayable(amount, discountPercent, discountAmount) {
    const base = Number(amount);
    let discount = 0;
    if (discountPercent != null) {
      discount += (base * Number(discountPercent)) / 100;
    }
    if (discountAmount != null) {
      discount += Number(discountAmount);
    }
    discount = Math.min(discount, base);
    const payableAmount = Number(Math.max(base - discount, 0).toFixed(2));
    return {
      amount: base,
      discountPercent: discountPercent != null ? Number(discountPercent) : null,
      discountAmount: Number(discount.toFixed(2)),
      payableAmount,
    };
  }

  /**
   * Booking QR pricing preview — applies service discount / coresyDiscount.
   * Optional cashier override via discountPercent / discountAmount.
   */
  async getBookingQRPricing(token, overrides = {}) {
    const qrCode = await qrRepository.findByToken(token);
    if (!qrCode) throw new AppError(ERROR_MESSAGES.QR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const service = await prisma.service.findFirst({
      where: { id: qrCode.serviceId, deletedAt: null },
    });
    if (!service) throw new AppError(ERROR_MESSAGES.SERVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const originalPrice = Number(service.price);
    const serviceDiscountPercent = Number(service.discountPercentage || 0);
    const coresyDiscountPercent = Number(service.coresyDiscount || 0);
    const combinedPercent =
      overrides.discountPercent != null
        ? Number(overrides.discountPercent)
        : serviceDiscountPercent + coresyDiscountPercent;

    const pricing = this._computePayable(
      originalPrice,
      combinedPercent,
      overrides.discountAmount,
    );

    return {
      qrId: qrCode.qrId,
      token: qrCode.token,
      bookingId: qrCode.bookingId,
      bookingNumber: qrCode.bookingNumber,
      businessId: qrCode.businessId,
      branchId: qrCode.branchId,
      serviceId: qrCode.serviceId,
      serviceName: service.name,
      originalPrice,
      serviceDiscountPercent,
      coresyDiscountPercent,
      ...pricing,
      currency: 'SYP',
    };
  }

  /**
   * Business creates a payment QR (with optional discount).
   * Customer later pays via wallet + password.
   */
  async createPaymentQR(data, userId, user) {
    const business = await prisma.business.findFirst({
      where: { id: data.businessId, deletedAt: null },
    });
    if (!business) throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (user.roles.includes(ROLES.BUSINESS_OWNER) && business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    if (data.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: data.branchId, deletedAt: null },
      });
      if (!branch || branch.businessId !== data.businessId) {
        throw new AppError(ERROR_MESSAGES.BRANCH_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
      }
    }

    const pricing = this._computePayable(
      data.amount,
      data.discountPercent,
      data.discountAmount,
    );
    if (pricing.payableAmount <= 0) {
      throw new AppError(ERROR_MESSAGES.PAYMENT_INVALID_AMOUNT, HTTP_STATUS.BAD_REQUEST);
    }

    const qrId = `PQR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const token = generateToken();
    const expiresAt = data.expiresInMinutes
      ? new Date(Date.now() + Number(data.expiresInMinutes) * 60 * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const paymentQr = await paymentQRRepository.create({
      qrId,
      token,
      businessId: data.businessId,
      branchId: data.branchId || null,
      bookingId: data.bookingId || null,
      title: data.title || null,
      description: data.description || null,
      amount: pricing.amount,
      discountPercent: data.discountPercent != null ? Number(data.discountPercent) : null,
      discountAmount: pricing.discountAmount,
      payableAmount: pricing.payableAmount,
      currency: data.currency || 'SYP',
      status: PAYMENT_QR_STATUS.ACTIVE,
      expiresAt,
      createdBy: userId,
    });

    await auditLogService.create({
      userId,
      action: 'PAYMENT_QR_CREATED',
      module: 'QR',
      payload: { qrId, payableAmount: pricing.payableAmount },
    });

    return { message: SUCCESS_MESSAGES.PAYMENT_QR_CREATED, paymentQr };
  }

  async getPaymentQR(token) {
    const paymentQr = await paymentQRRepository.findByToken(token);
    if (!paymentQr) throw new AppError(ERROR_MESSAGES.PAYMENT_QR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (paymentQr.expiresAt && new Date() > new Date(paymentQr.expiresAt)) {
      if (paymentQr.status === PAYMENT_QR_STATUS.ACTIVE) {
        await paymentQRRepository.update(paymentQr.id, { status: PAYMENT_QR_STATUS.EXPIRED });
      }
      throw new AppError(ERROR_MESSAGES.QR_EXPIRED, HTTP_STATUS.BAD_REQUEST);
    }

    return {
      paymentQr: {
        ...paymentQr,
        amountToPay: Number(paymentQr.payableAmount),
      },
    };
  }

  async payPaymentQR(token, password, user, ipAddress, userAgent) {
    const paymentQr = await paymentQRRepository.findByToken(token);
    if (!paymentQr) throw new AppError(ERROR_MESSAGES.PAYMENT_QR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (paymentQr.status === PAYMENT_QR_STATUS.PAID) {
      throw new AppError(ERROR_MESSAGES.PAYMENT_QR_ALREADY_PAID, HTTP_STATUS.CONFLICT);
    }
    if (paymentQr.status !== PAYMENT_QR_STATUS.ACTIVE) {
      throw new AppError(ERROR_MESSAGES.PAYMENT_QR_INACTIVE, HTTP_STATUS.BAD_REQUEST);
    }
    if (paymentQr.expiresAt && new Date() > new Date(paymentQr.expiresAt)) {
      await paymentQRRepository.update(paymentQr.id, { status: PAYMENT_QR_STATUS.EXPIRED });
      throw new AppError(ERROR_MESSAGES.QR_EXPIRED, HTTP_STATUS.BAD_REQUEST);
    }

    const dbUser = await prisma.user.findFirst({
      where: { id: user.id, deletedAt: null },
    });
    if (!dbUser) throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const valid = await comparePassword(password, dbUser.password);
    if (!valid) throw new AppError(ERROR_MESSAGES.INVALID_PASSWORD, HTTP_STATUS.UNAUTHORIZED);

    const paymentResult = await paymentService.createPayment(
      {
        customerId: user.id,
        businessId: paymentQr.businessId,
        branchId: paymentQr.branchId,
        bookingId: paymentQr.bookingId || undefined,
        paymentMethod: PAYMENT_METHOD_TYPE.WALLET,
        paymentType: paymentQr.bookingId ? 'BOOKING' : 'OTHER',
        subtotal: Number(paymentQr.amount),
        discount: Number(paymentQr.discountAmount || 0),
        grandTotal: Number(paymentQr.payableAmount),
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

    const updated = await paymentQRRepository.update(paymentQr.id, {
      status: PAYMENT_QR_STATUS.PAID,
      paidById: user.id,
      paidAt: new Date(),
      paymentId: paymentResult.payment.paymentId,
      updatedBy: user.id,
    });

    await auditLogService.create({
      userId: user.id,
      action: 'PAYMENT_QR_PAID',
      module: 'QR',
      ipAddress,
      userAgent,
      payload: {
        qrId: paymentQr.qrId,
        paymentId: paymentResult.payment.paymentId,
        amount: paymentQr.payableAmount,
      },
    });

    return {
      message: SUCCESS_MESSAGES.PAYMENT_QR_PAID,
      paymentQr: updated,
      payment: paymentResult.payment,
    };
  }

  async cancelPaymentQR(id, userId, user) {
    const paymentQr = await paymentQRRepository.findById(id);
    if (!paymentQr) throw new AppError(ERROR_MESSAGES.PAYMENT_QR_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (user.roles.includes(ROLES.BUSINESS_OWNER) && paymentQr.business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
    if (paymentQr.status === PAYMENT_QR_STATUS.PAID) {
      throw new AppError(ERROR_MESSAGES.PAYMENT_QR_ALREADY_PAID, HTTP_STATUS.CONFLICT);
    }

    const updated = await paymentQRRepository.update(id, {
      status: PAYMENT_QR_STATUS.CANCELLED,
      updatedBy: userId,
    });

    return { message: SUCCESS_MESSAGES.PAYMENT_QR_CANCELLED, paymentQr: updated };
  }

  async listPaymentQRs(query, user) {
    const filters = { ...query };
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && !filters.businessId) {
      const businesses = await prisma.business.findMany({
        where: { ownerId: user.id, deletedAt: null },
        select: { id: true },
      });
      if (businesses.length === 1) {
        filters.businessId = businesses[0].id;
      } else if (businesses.length > 1) {
        const resultLists = await Promise.all(
          businesses.map((b) => paymentQRRepository.findAll({ ...query, businessId: b.id })),
        );
        const merged = resultLists.flatMap((r) => r.paymentQrs);
        return {
          paymentQrs: merged,
          pagination: { page: 1, limit: merged.length, total: merged.length, pages: 1 },
        };
      }
    }
    return paymentQRRepository.findAll(filters);
  }
}

module.exports = new QRService();
