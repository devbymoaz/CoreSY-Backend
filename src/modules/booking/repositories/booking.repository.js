const { prisma } = require('../../../prisma');
const { PAGINATION } = require('../../../constants');

const BOOKING_INCLUDE = {
  customer: true,
  business: true,
  branch: true,
  service: true,
  slot: true,
};

class BookingRepository {
  async create(data) {
    return prisma.booking.create({
      data,
      include: BOOKING_INCLUDE,
    });
  }

  async findById(id) {
    return prisma.booking.findUnique({
      where: { id, deletedAt: null },
      include: BOOKING_INCLUDE,
    });
  }

  async findByBookingNumber(bookingNumber) {
    return prisma.booking.findUnique({
      where: { bookingNumber, deletedAt: null },
      include: BOOKING_INCLUDE,
    });
  }

  async findAll({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search,
    customerId,
    businessId,
    branchId,
    serviceId,
    slotId,
    status,
    paymentStatus,
    bookingType,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const skip = (page - 1) * limit;
    const where = { deletedAt: null };

    if (customerId) where.customerId = customerId;
    if (businessId) where.businessId = businessId;
    if (branchId) where.branchId = branchId;
    if (serviceId) where.serviceId = serviceId;
    if (slotId) where.slotId = slotId;
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (bookingType) where.bookingType = bookingType;
    if (startDate || endDate) {
      where.reservationDate = {};
      if (startDate) where.reservationDate.gte = new Date(startDate);
      if (endDate) where.reservationDate.lte = new Date(endDate);
    }
    if (search) {
      where.OR = [
        { bookingNumber: { contains: search, mode: 'insensitive' } },
        { customer: { fullName: { contains: search, mode: 'insensitive' } } },
        { business: { name: { contains: search, mode: 'insensitive' } } },
        { branch: { name: { contains: search, mode: 'insensitive' } } },
        { service: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: BOOKING_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return { bookings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async findUpcoming(customerId, options = {}) {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      sortBy = 'reservationDate',
      sortOrder = 'asc',
    } = options;
    const skip = (page - 1) * limit;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where = {
      customerId,
      deletedAt: null,
      reservationDate: { gte: today },
      status: { notIn: ['CANCELLED', 'COMPLETED', 'EXPIRED', 'REJECTED', 'NO_SHOW'] },
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: BOOKING_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return { bookings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async findHistory(customerId, options = {}) {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      sortBy = 'reservationDate',
      sortOrder = 'desc',
    } = options;
    const skip = (page - 1) * limit;

    const where = {
      customerId,
      deletedAt: null,
      status: { in: ['COMPLETED', 'CANCELLED', 'EXPIRED', 'REJECTED', 'NO_SHOW'] },
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: BOOKING_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return { bookings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async findBusinessUpcoming(businessId, options = {}) {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      sortBy = 'reservationDate',
      sortOrder = 'asc',
      branchId,
    } = options;
    const skip = (page - 1) * limit;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where = {
      businessId,
      deletedAt: null,
      reservationDate: { gte: today },
      status: { notIn: ['CANCELLED', 'COMPLETED', 'EXPIRED', 'REJECTED', 'NO_SHOW'] },
    };
    if (branchId) where.branchId = branchId;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: BOOKING_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return { bookings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async findBusinessToday(businessId, options = {}) {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      sortBy = 'startTime',
      sortOrder = 'asc',
      branchId,
    } = options;
    const skip = (page - 1) * limit;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where = {
      businessId,
      deletedAt: null,
      reservationDate: { gte: today, lt: tomorrow },
    };
    if (branchId) where.branchId = branchId;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: BOOKING_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return { bookings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async update(id, data) {
    return prisma.booking.update({
      where: { id },
      data,
      include: BOOKING_INCLUDE,
    });
  }

  async softDelete(id, deletedBy) {
    return prisma.booking.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: deletedBy },
      include: BOOKING_INCLUDE,
    });
  }

  async checkDuplicateBooking(customerId, slotId) {
    return prisma.booking.findFirst({
      where: {
        customerId,
        slotId,
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'REJECTED', 'EXPIRED'] },
      },
    });
  }

  async getCustomerDashboardStats(customerId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [upcomingCount, completedCount, cancelledCount, favoritesCount] = await Promise.all([
      prisma.booking.count({
        where: {
          customerId,
          deletedAt: null,
          reservationDate: { gte: today },
          status: { notIn: ['CANCELLED', 'COMPLETED', 'EXPIRED', 'REJECTED', 'NO_SHOW'] },
        },
      }),
      prisma.booking.count({
        where: {
          customerId,
          deletedAt: null,
          status: 'COMPLETED',
        },
      }),
      prisma.booking.count({
        where: {
          customerId,
          deletedAt: null,
          status: 'CANCELLED',
        },
      }),
      prisma.favoriteBusiness.count({
        where: {
          userId: customerId,
        },
      }),
    ]);

    return {
      upcomingBookings: upcomingCount,
      completedBookings: completedCount,
      cancelledBookings: cancelledCount,
      favoriteBusinesses: favoritesCount,
    };
  }

  async getBusinessDashboardStats(businessId, branchId = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const baseWhere = { businessId, deletedAt: null };
    if (branchId) baseWhere.branchId = branchId;

    const [
      todayReservations,
      todayAppointments,
      pendingBookings,
      confirmedBookings,
      cancelledBookings,
      completedBookings,
    ] = await Promise.all([
      prisma.booking.count({
        where: {
          ...baseWhere,
          reservationDate: { gte: today, lt: tomorrow },
          bookingType: 'RESERVATION',
        },
      }),
      prisma.booking.count({
        where: {
          ...baseWhere,
          reservationDate: { gte: today, lt: tomorrow },
          bookingType: 'APPOINTMENT',
        },
      }),
      prisma.booking.count({
        where: {
          ...baseWhere,
          status: 'PENDING',
        },
      }),
      prisma.booking.count({
        where: {
          ...baseWhere,
          status: 'CONFIRMED',
        },
      }),
      prisma.booking.count({
        where: {
          ...baseWhere,
          status: 'CANCELLED',
        },
      }),
      prisma.booking.count({
        where: {
          ...baseWhere,
          status: 'COMPLETED',
        },
      }),
    ]);

    return {
      todayReservations,
      todayAppointments,
      pendingBookings,
      confirmedBookings,
      cancelledBookings,
      completedBookings,
    };
  }

  // Favorite Business methods
  async addFavorite(userId, businessId) {
    return prisma.favoriteBusiness.create({
      data: { userId, businessId },
      include: { business: true },
    });
  }

  async removeFavorite(userId, businessId) {
    return prisma.favoriteBusiness.deleteMany({
      where: { userId, businessId },
    });
  }

  async getFavorites(userId, options = {}) {
    const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT } = options;
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      prisma.favoriteBusiness.findMany({
        where: { userId },
        include: { business: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.favoriteBusiness.count({ where: { userId } }),
    ]);

    return { favorites, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async checkFavorite(userId, businessId) {
    return prisma.favoriteBusiness.findUnique({
      where: { userId_businessId: { userId, businessId } },
    });
  }
}

module.exports = new BookingRepository();
