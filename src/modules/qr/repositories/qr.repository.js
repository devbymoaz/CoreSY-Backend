const { prisma } = require('../../../prisma');
const { PAGINATION } = require('../../../constants');

const QR_INCLUDE = {
  booking: true,
  customer: true,
  business: true,
  branch: true,
  service: true,
  cashier: true,
};

class QRRepository {
  async create(data) {
    return prisma.qRCode.create({
      data,
      include: QR_INCLUDE,
    });
  }

  async findById(id) {
    return prisma.qRCode.findUnique({
      where: { id },
      include: QR_INCLUDE,
    });
  }

  async findByQrId(qrId) {
    return prisma.qRCode.findUnique({
      where: { qrId },
      include: QR_INCLUDE,
    });
  }

  async findByToken(token) {
    return prisma.qRCode.findUnique({
      where: { token },
      include: QR_INCLUDE,
    });
  }

  async findByBookingId(bookingId) {
    return prisma.qRCode.findUnique({
      where: { bookingId },
      include: QR_INCLUDE,
    });
  }

  async findByBookingNumber(bookingNumber) {
    return prisma.qRCode.findFirst({
      where: { bookingNumber },
      include: QR_INCLUDE,
    });
  }

  async findAll({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search,
    customerId,
    businessId,
    branchId,
    cashierId,
    status,
    bookingDateFrom,
    bookingDateTo,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const skip = (page - 1) * limit;
    const where = {};

    if (customerId) where.customerId = customerId;
    if (businessId) where.businessId = businessId;
    if (branchId) where.branchId = branchId;
    if (cashierId) where.scannedBy = cashierId;
    if (status) where.status = status;

    if (bookingDateFrom || bookingDateTo) {
      where.bookingDate = {};
      if (bookingDateFrom) where.bookingDate.gte = new Date(bookingDateFrom);
      if (bookingDateTo) where.bookingDate.lte = new Date(bookingDateTo);
    }

    if (search) {
      where.OR = [
        { bookingNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { qrId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [qrCodes, total] = await Promise.all([
      prisma.qRCode.findMany({
        where,
        include: QR_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.qRCode.count({ where }),
    ]);

    return { qrCodes, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async update(id, data) {
    return prisma.qRCode.update({
      where: { id },
      data,
      include: QR_INCLUDE,
    });
  }

  async delete(id) {
    return prisma.qRCode.delete({
      where: { id },
      include: QR_INCLUDE,
    });
  }

  // Dashboard statistics
  async getCustomerDashboardStats(customerId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [upcomingCount, qrReadyCount, checkedInCount, completedCount] = await Promise.all([
      prisma.qRCode.count({
        where: {
          customerId,
          bookingDate: { gte: today },
          status: { in: ['GENERATED', 'ACTIVE'] },
        },
      }),
      prisma.qRCode.count({
        where: {
          customerId,
          status: 'ACTIVE',
        },
      }),
      prisma.qRCode.count({
        where: {
          customerId,
          status: 'SCANNED',
        },
      }),
      prisma.qRCode.count({
        where: {
          customerId,
          status: 'COMPLETED',
        },
      }),
    ]);

    return {
      upcomingBookings: upcomingCount,
      qrReady: qrReadyCount,
      checkedIn: checkedInCount,
      completed: completedCount,
    };
  }

  async getBusinessDashboardStats(businessId, branchId = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const baseWhere = { businessId };
    if (branchId) baseWhere.branchId = branchId;

    const [
      todayCheckIns,
      todayCheckOuts,
      scannedQRs,
      completedVisits,
      cancelledVisits,
      expiredQRs,
    ] = await Promise.all([
      prisma.qRCode.count({
        where: {
          ...baseWhere,
          checkedInAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.qRCode.count({
        where: {
          ...baseWhere,
          checkedOutAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.qRCode.count({
        where: {
          ...baseWhere,
          status: 'SCANNED',
        },
      }),
      prisma.qRCode.count({
        where: {
          ...baseWhere,
          status: 'COMPLETED',
        },
      }),
      prisma.qRCode.count({
        where: {
          ...baseWhere,
          status: 'CANCELLED',
        },
      }),
      prisma.qRCode.count({
        where: {
          ...baseWhere,
          status: 'EXPIRED',
        },
      }),
    ]);

    return {
      todayCheckIns,
      todayCheckOuts,
      scannedQRs,
      completedVisits,
      cancelledVisits,
      expiredQRs,
    };
  }

  async getCashierDashboardStats(cashierId, branchId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const baseWhere = { branchId };
    const cashierWhere = { ...baseWhere, scannedBy: cashierId };

    const [
      todayScans,
      todayCheckIns,
      todayCheckOuts,
      pendingCustomers,
      completedCustomers,
    ] = await Promise.all([
      prisma.qRCode.count({
        where: {
          ...cashierWhere,
          scannedAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.qRCode.count({
        where: {
          ...cashierWhere,
          checkedInAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.qRCode.count({
        where: {
          ...cashierWhere,
          checkedOutAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.qRCode.count({
        where: {
          ...baseWhere,
          status: { in: ['ACTIVE', 'GENERATED'] },
        },
      }),
      prisma.qRCode.count({
        where: {
          ...baseWhere,
          status: 'COMPLETED',
        },
      }),
    ]);

    return {
      todayScans,
      todayCheckIns,
      todayCheckOuts,
      pendingCustomers,
      completedCustomers,
    };
  }
}

module.exports = new QRRepository();
