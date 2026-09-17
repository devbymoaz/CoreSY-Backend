const bookingRepository = require('../repositories/booking.repository');
const slotRepository = require('../../slot/repositories/slot.repository');
const businessRepository = require('../../business/repositories/business.repository');
const branchRepository = require('../../branch/repositories/branch.repository');
const serviceRepository = require('../../service/repositories/service.repository');
const qrRepository = require('../../qr/repositories/qr.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const notificationService = require('../../notification/services/notification.service');
const AppError = require('../../../utils/AppError');
const logger = require('../../../utils/logger');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  BOOKING_SOURCE,
  QR_STATUS,
  NOTIFICATION_CHANNEL,
  NOTIFICATION_PRIORITY,
} = require('../../../constants');
const { prisma } = require('../../../prisma');
const crypto = require('crypto');

function generateQrId() {
  return `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function calculateExpiry(bookingDate, startTime) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const expiry = new Date(bookingDate);
  expiry.setHours(hours + 2, minutes); // Expire 2 hours after slot start
  return expiry;
}

function generateBookingNumber() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `BK${timestamp}${random}`;
}

class BookingService {
  async _notifySafe(payload) {
    try {
      await notificationService.send(payload);
    } catch (error) {
      logger.error('Booking notification failed:', error.message || error);
    }
  }

  async createBooking(data, userId, ipAddress, userAgent, _user) {
    const slot = await slotRepository.findById(data.slotId);
    if (!slot) throw new AppError(ERROR_MESSAGES.SLOT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (slot.status !== 'AVAILABLE') {
      throw new AppError(ERROR_MESSAGES.SLOT_NOT_AVAILABLE, HTTP_STATUS.CONFLICT);
    }

    if (slot.remainingCapacity < data.numberOfGuests) {
      throw new AppError(ERROR_MESSAGES.INSUFFICIENT_CAPACITY, HTTP_STATUS.CONFLICT);
    }

    const duplicateBooking = await bookingRepository.checkDuplicateBooking(userId, data.slotId);
    if (duplicateBooking) {
      throw new AppError(ERROR_MESSAGES.DUPLICATE_BOOKING, HTTP_STATUS.CONFLICT);
    }

    const bookingData = {
      bookingNumber: generateBookingNumber(),
      customerId: userId,
      businessId: slot.businessId,
      branchId: slot.branchId,
      serviceId: slot.serviceId,
      slotId: data.slotId,
      bookingType: slot.bookingType,
      reservationDate: slot.slotDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      numberOfGuests: data.numberOfGuests,
      specialInstructions: data.specialInstructions,
      bookingSource: BOOKING_SOURCE.MOBILE_APP,
      paymentMethod: data.paymentMethod,
      paymentStatus: PAYMENT_STATUS.PENDING,
      status: BOOKING_STATUS.PENDING,
      createdBy: userId,
    };

    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: bookingData,
        include: {
          customer: true,
          business: true,
          branch: true,
          service: true,
          slot: true,
        },
      });

      const newRemainingCapacity = slot.remainingCapacity - data.numberOfGuests;
      const updateData = {
        remainingCapacity: newRemainingCapacity,
        updatedBy: userId,
      };
      if (newRemainingCapacity === 0) {
        updateData.status = 'FULL';
      }
      await tx.slot.update({
        where: { id: data.slotId },
        data: updateData,
      });

      return newBooking;
    });

    await auditLogService.create({
      userId,
      action: 'BOOKING_CREATED',
      module: 'Bookings',
      ipAddress,
      userAgent,
      payload: { bookingId: booking.id, bookingNumber: booking.bookingNumber },
    });

    // Notify business owner about new reservation request
    if (booking.business?.ownerId) {
      await this._notifySafe({
        userId: booking.business.ownerId,
        senderId: userId,
        title: 'New reservation request',
        message: `${booking.customer?.fullName || 'A customer'} requested ${booking.service?.name || 'a service'} (${booking.bookingNumber}) on ${new Date(booking.reservationDate).toISOString().slice(0, 10)} at ${booking.startTime}.`,
        type: 'BOOKING_CREATED',
        channel: NOTIFICATION_CHANNEL.IN_APP,
        priority: NOTIFICATION_PRIORITY.HIGH,
        module: 'Bookings',
        referenceId: booking.id,
        data: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          status: booking.status,
        },
      });
    }

    return { message: SUCCESS_MESSAGES.BOOKING_CREATED, booking };
  }

  async getBookings(query, user) {
    const where = { ...query };
    if (user.roles.includes(ROLES.USER)) {
      where.customerId = user.id;
    } else if (user.roles.includes(ROLES.BUSINESS_OWNER)) {
      const result = await businessRepository.findByOwnerId(user.id);
      const businessIds = result.businesses.map((b) => b.id);
      where.businessId = { in: businessIds };
    } else if (user.roles.includes(ROLES.CASHIER)) {
      const cashier = await prisma.cashier.findUnique({ where: { id: user.id } });
      if (cashier) {
        where.branchId = cashier.branchId;
      }
    }
    return bookingRepository.findAll(where);
  }

  async getBookingById(id, user) {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw new AppError(ERROR_MESSAGES.BOOKING_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const isOwner = booking.customerId === user.id;
    const isBusinessOwner = booking.business.ownerId === user.id;
    const isCashier = await prisma.cashier.findUnique({
      where: { id: user.id, branchId: booking.branchId },
    });

    if (
      !isOwner &&
      !isBusinessOwner &&
      !isCashier &&
      !user.roles.includes(ROLES.SUPER_ADMIN) &&
      !user.roles.includes(ROLES.SUPPORT_ADMIN) &&
      !user.roles.includes(ROLES.FINANCE_ADMIN)
    ) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    return { booking };
  }

  async updateBooking(id, data, userId, ipAddress, userAgent, user) {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw new AppError(ERROR_MESSAGES.BOOKING_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (booking.customerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    if (booking.status !== BOOKING_STATUS.PENDING && booking.status !== BOOKING_STATUS.CONFIRMED) {
      throw new AppError(ERROR_MESSAGES.BOOKING_CANNOT_BE_UPDATED, HTTP_STATUS.BAD_REQUEST);
    }

    const updatedBooking = await bookingRepository.update(id, {
      ...data,
      updatedBy: userId,
    });

    await auditLogService.create({
      userId,
      action: 'BOOKING_UPDATED',
      module: 'Bookings',
      ipAddress,
      userAgent,
      payload: { bookingId: id },
    });

    return { message: SUCCESS_MESSAGES.BOOKING_UPDATED, booking: updatedBooking };
  }

  async cancelBooking(id, data, userId, ipAddress, userAgent, user) {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw new AppError(ERROR_MESSAGES.BOOKING_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const isOwner = booking.customerId === user.id;
    const isBusinessOwner = booking.business.ownerId === user.id;

    if (!isOwner && !isBusinessOwner && !user.roles.includes(ROLES.SUPER_ADMIN)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    if (
      booking.status === BOOKING_STATUS.COMPLETED ||
      booking.status === BOOKING_STATUS.CANCELLED ||
      booking.status === BOOKING_STATUS.EXPIRED ||
      booking.status === BOOKING_STATUS.REJECTED
    ) {
      throw new AppError(ERROR_MESSAGES.BOOKING_CANNOT_BE_CANCELLED, HTTP_STATUS.BAD_REQUEST);
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: BOOKING_STATUS.CANCELLED,
          cancellationReason: data.cancellationReason,
          updatedBy: userId,
        },
        include: {
          customer: true,
          business: true,
          branch: true,
          service: true,
          slot: true,
        },
      });

      const slot = await tx.slot.findUnique({ where: { id: booking.slotId } });
      if (slot) {
        const newRemainingCapacity = slot.remainingCapacity + booking.numberOfGuests;
        const updateData = {
          remainingCapacity: newRemainingCapacity,
          updatedBy: userId,
        };
        if (slot.status === 'FULL' && newRemainingCapacity > 0) {
          updateData.status = 'AVAILABLE';
        }
        await tx.slot.update({
          where: { id: booking.slotId },
          data: updateData,
        });
      }

      return updated;
    });

    await auditLogService.create({
      userId,
      action: 'BOOKING_CANCELLED',
      module: 'Bookings',
      ipAddress,
      userAgent,
      payload: { bookingId: id },
    });

    // Notify the other party about cancellation
    const cancelRecipientId = isOwner ? booking.business?.ownerId : booking.customerId;
    if (cancelRecipientId) {
      await this._notifySafe({
        userId: cancelRecipientId,
        senderId: userId,
        title: 'Reservation cancelled',
        message: `Reservation ${booking.bookingNumber} was cancelled${data.cancellationReason ? `: ${data.cancellationReason}` : '.'}`,
        type: 'BOOKING_CANCELLED',
        channel: NOTIFICATION_CHANNEL.IN_APP,
        priority: NOTIFICATION_PRIORITY.HIGH,
        module: 'Bookings',
        referenceId: booking.id,
        data: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          status: BOOKING_STATUS.CANCELLED,
        },
      });
    }

    return { message: SUCCESS_MESSAGES.BOOKING_CANCELLED, booking: updatedBooking };
  }

  async rescheduleBooking(id, data, userId, ipAddress, userAgent, user) {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw new AppError(ERROR_MESSAGES.BOOKING_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (booking.customerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    if (booking.status !== BOOKING_STATUS.PENDING && booking.status !== BOOKING_STATUS.CONFIRMED) {
      throw new AppError(ERROR_MESSAGES.BOOKING_CANNOT_BE_UPDATED, HTTP_STATUS.BAD_REQUEST);
    }

    const newSlot = await slotRepository.findById(data.slotId);
    if (!newSlot) throw new AppError(ERROR_MESSAGES.SLOT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (newSlot.status !== 'AVAILABLE') {
      throw new AppError(ERROR_MESSAGES.SLOT_NOT_AVAILABLE, HTTP_STATUS.CONFLICT);
    }

    if (newSlot.remainingCapacity < booking.numberOfGuests) {
      throw new AppError(ERROR_MESSAGES.INSUFFICIENT_CAPACITY, HTTP_STATUS.CONFLICT);
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const oldSlot = await tx.slot.findUnique({ where: { id: booking.slotId } });
      if (oldSlot) {
        const oldRemainingCapacity = oldSlot.remainingCapacity + booking.numberOfGuests;
        const oldUpdateData = {
          remainingCapacity: oldRemainingCapacity,
          updatedBy: userId,
        };
        if (oldSlot.status === 'FULL' && oldRemainingCapacity > 0) {
          oldUpdateData.status = 'AVAILABLE';
        }
        await tx.slot.update({
          where: { id: booking.slotId },
          data: oldUpdateData,
        });
      }

      const newRemainingCapacity = newSlot.remainingCapacity - booking.numberOfGuests;
      const newUpdateData = {
        remainingCapacity: newRemainingCapacity,
        updatedBy: userId,
      };
      if (newRemainingCapacity === 0) {
        newUpdateData.status = 'FULL';
      }
      await tx.slot.update({
        where: { id: data.slotId },
        data: newUpdateData,
      });

      return tx.booking.update({
        where: { id },
        data: {
          slotId: data.slotId,
          businessId: newSlot.businessId,
          branchId: newSlot.branchId,
          serviceId: newSlot.serviceId,
          bookingType: newSlot.bookingType,
          reservationDate: newSlot.slotDate,
          startTime: newSlot.startTime,
          endTime: newSlot.endTime,
          updatedBy: userId,
        },
        include: {
          customer: true,
          business: true,
          branch: true,
          service: true,
          slot: true,
        },
      });
    });

    await auditLogService.create({
      userId,
      action: 'BOOKING_RESCHEDULED',
      module: 'Bookings',
      ipAddress,
      userAgent,
      payload: { bookingId: id, oldSlotId: booking.slotId, newSlotId: data.slotId },
    });

    return { message: SUCCESS_MESSAGES.BOOKING_RESCHEDULED, booking: updatedBooking };
  }

  async getUpcomingBookings(userId, options) {
    return bookingRepository.findUpcoming(userId, options);
  }

  async getBookingHistory(userId, options) {
    return bookingRepository.findHistory(userId, options);
  }

  async getBusinessBookings(query, user) {
    const where = { ...query };
    const result = await businessRepository.findByOwnerId(user.id);
    const businessIds = result.businesses.map((b) => b.id);
    where.businessId = { in: businessIds };
    return bookingRepository.findAll(where);
  }

  async getBusinessTodayBookings(businessId, options, user) {
    const business = await businessRepository.findById(businessId);
    if (!business) throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
    return bookingRepository.findBusinessToday(businessId, options);
  }

  async getBusinessUpcomingBookings(businessId, options, user) {
    const business = await businessRepository.findById(businessId);
    if (!business) throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
    return bookingRepository.findBusinessUpcoming(businessId, options);
  }

  async confirmBooking(id, userId, ipAddress, userAgent, user) {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw new AppError(ERROR_MESSAGES.BOOKING_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const isBusinessOwner = booking.business.ownerId === user.id;

    if (!isBusinessOwner && !user.roles.includes(ROLES.SUPER_ADMIN)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    if (booking.status !== BOOKING_STATUS.PENDING) {
      throw new AppError(ERROR_MESSAGES.INVALID_BOOKING_STATUS, HTTP_STATUS.BAD_REQUEST);
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      // Update booking status
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: BOOKING_STATUS.CONFIRMED,
          updatedBy: userId,
        },
        include: {
          customer: true,
          business: true,
          branch: true,
          service: true,
          slot: true,
        },
      });

      // Generate QR code
      const qrId = generateQrId();
      const token = generateToken();
      const expiryTime = calculateExpiry(booking.reservationDate, booking.startTime);

      await tx.qRCode.create({
        data: {
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
        },
      });

      return updated;
    });

    await auditLogService.create({
      userId,
      action: 'BOOKING_CONFIRMED',
      module: 'Bookings',
      ipAddress,
      userAgent,
      payload: { bookingId: id },
    });

    // Notify customer that business owner confirmed the reservation
    if (updatedBooking.customerId) {
      await this._notifySafe({
        userId: updatedBooking.customerId,
        senderId: userId,
        title: 'Reservation confirmed',
        message: `Your reservation ${updatedBooking.bookingNumber} for ${updatedBooking.service?.name || 'the service'} has been confirmed by ${updatedBooking.business?.name || 'the business'}.`,
        type: 'BOOKING_CONFIRMED',
        channel: NOTIFICATION_CHANNEL.IN_APP,
        priority: NOTIFICATION_PRIORITY.HIGH,
        module: 'Bookings',
        referenceId: updatedBooking.id,
        data: {
          bookingId: updatedBooking.id,
          bookingNumber: updatedBooking.bookingNumber,
          status: BOOKING_STATUS.CONFIRMED,
        },
      });
    }

    return { message: SUCCESS_MESSAGES.BOOKING_CONFIRMED, booking: updatedBooking };
  }

  async checkInBooking(id, userId, ipAddress, userAgent, user) {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw new AppError(ERROR_MESSAGES.BOOKING_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const isBusinessOwner = booking.business.ownerId === user.id;
    const isCashier = await prisma.cashier.findUnique({
      where: { id: user.id, branchId: booking.branchId },
    });

    if (!isBusinessOwner && !isCashier && !user.roles.includes(ROLES.SUPER_ADMIN)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    if (booking.status !== BOOKING_STATUS.CONFIRMED) {
      throw new AppError(ERROR_MESSAGES.INVALID_BOOKING_STATUS, HTTP_STATUS.BAD_REQUEST);
    }

    const updatedBooking = await bookingRepository.update(id, {
      status: BOOKING_STATUS.CHECKED_IN,
      checkInTime: new Date(),
      updatedBy: userId,
    });

    await auditLogService.create({
      userId,
      action: 'BOOKING_CHECKED_IN',
      module: 'Bookings',
      ipAddress,
      userAgent,
      payload: { bookingId: id },
    });

    return { message: SUCCESS_MESSAGES.BOOKING_CHECKED_IN, booking: updatedBooking };
  }

  async checkOutBooking(id, userId, ipAddress, userAgent, user) {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw new AppError(ERROR_MESSAGES.BOOKING_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const isBusinessOwner = booking.business.ownerId === user.id;
    const isCashier = await prisma.cashier.findUnique({
      where: { id: user.id, branchId: booking.branchId },
    });

    if (!isBusinessOwner && !isCashier && !user.roles.includes(ROLES.SUPER_ADMIN)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    if (
      booking.status !== BOOKING_STATUS.CHECKED_IN &&
      booking.status !== BOOKING_STATUS.IN_PROGRESS
    ) {
      throw new AppError(ERROR_MESSAGES.INVALID_BOOKING_STATUS, HTTP_STATUS.BAD_REQUEST);
    }

    const updatedBooking = await bookingRepository.update(id, {
      status: BOOKING_STATUS.COMPLETED,
      checkOutTime: new Date(),
      updatedBy: userId,
    });

    await auditLogService.create({
      userId,
      action: 'BOOKING_COMPLETED',
      module: 'Bookings',
      ipAddress,
      userAgent,
      payload: { bookingId: id },
    });

    return { message: SUCCESS_MESSAGES.BOOKING_CHECKED_OUT, booking: updatedBooking };
  }

  async rejectBooking(id, userId, ipAddress, userAgent, user) {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw new AppError(ERROR_MESSAGES.BOOKING_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const isBusinessOwner = booking.business.ownerId === user.id;

    if (!isBusinessOwner && !user.roles.includes(ROLES.SUPER_ADMIN)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    if (booking.status !== BOOKING_STATUS.PENDING) {
      throw new AppError(ERROR_MESSAGES.INVALID_BOOKING_STATUS, HTTP_STATUS.BAD_REQUEST);
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: BOOKING_STATUS.REJECTED,
          updatedBy: userId,
        },
        include: {
          customer: true,
          business: true,
          branch: true,
          service: true,
          slot: true,
        },
      });

      const slot = await tx.slot.findUnique({ where: { id: booking.slotId } });
      if (slot) {
        const newRemainingCapacity = slot.remainingCapacity + booking.numberOfGuests;
        const updateData = {
          remainingCapacity: newRemainingCapacity,
          updatedBy: userId,
        };
        if (slot.status === 'FULL' && newRemainingCapacity > 0) {
          updateData.status = 'AVAILABLE';
        }
        await tx.slot.update({
          where: { id: booking.slotId },
          data: updateData,
        });
      }

      return updated;
    });

    await auditLogService.create({
      userId,
      action: 'BOOKING_REJECTED',
      module: 'Bookings',
      ipAddress,
      userAgent,
      payload: { bookingId: id },
    });

    // Notify customer that business owner rejected the reservation
    if (updatedBooking.customerId) {
      await this._notifySafe({
        userId: updatedBooking.customerId,
        senderId: userId,
        title: 'Reservation declined',
        message: `Your reservation ${updatedBooking.bookingNumber} for ${updatedBooking.service?.name || 'the service'} was declined by ${updatedBooking.business?.name || 'the business'}.`,
        type: 'BOOKING_REJECTED',
        channel: NOTIFICATION_CHANNEL.IN_APP,
        priority: NOTIFICATION_PRIORITY.HIGH,
        module: 'Bookings',
        referenceId: updatedBooking.id,
        data: {
          bookingId: updatedBooking.id,
          bookingNumber: updatedBooking.bookingNumber,
          status: BOOKING_STATUS.REJECTED,
        },
      });
    }

    return { message: SUCCESS_MESSAGES.BOOKING_REJECTED, booking: updatedBooking };
  }

  async generateQRCode(id, userId, user) {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw new AppError(ERROR_MESSAGES.BOOKING_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (booking.customerId !== user.id && booking.business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const qrData = JSON.stringify({
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      customerId: booking.customerId,
      businessId: booking.businessId,
      branchId: booking.branchId,
    });

    const updatedBooking = await bookingRepository.update(id, {
      qrCode: qrData,
      updatedBy: userId,
    });

    return { message: SUCCESS_MESSAGES.QR_CODE_GENERATED, qrCode: qrData, booking: updatedBooking };
  }

  async addFavorite(userId, businessId, ipAddress, userAgent) {
    const business = await businessRepository.findById(businessId);
    if (!business) throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const favorite = await bookingRepository.addFavorite(userId, businessId);

    await auditLogService.create({
      userId,
      action: 'FAVORITE_ADDED',
      module: 'Bookings',
      ipAddress,
      userAgent,
      payload: { businessId },
    });

    return { message: SUCCESS_MESSAGES.FAVORITE_ADDED, favorite };
  }

  async removeFavorite(userId, businessId, ipAddress, userAgent) {
    await bookingRepository.removeFavorite(userId, businessId);

    await auditLogService.create({
      userId,
      action: 'FAVORITE_REMOVED',
      module: 'Bookings',
      ipAddress,
      userAgent,
      payload: { businessId },
    });

    return { message: SUCCESS_MESSAGES.FAVORITE_REMOVED };
  }

  async getFavorites(userId, options) {
    return bookingRepository.getFavorites(userId, options);
  }

  async getCustomerDashboard(userId) {
    return bookingRepository.getCustomerDashboardStats(userId);
  }

  async getBusinessDashboard(businessId, user) {
    const business = await businessRepository.findById(businessId);
    if (!business) throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
    return bookingRepository.getBusinessDashboardStats(businessId);
  }
}

module.exports = new BookingService();
