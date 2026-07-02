const qrRepository = require('../repositories/qr.repository');
const bookingRepository = require('../../booking/repositories/booking.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const AppError = require('../../../utils/AppError');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  QR_STATUS,
  BOOKING_STATUS,
  ROLES,
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
}

module.exports = new QRService();
