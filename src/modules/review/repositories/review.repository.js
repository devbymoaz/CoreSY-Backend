/**
 * Review repository.
 */

const { prisma } = require('../../../prisma');
const { PAGINATION, REVIEW_STATUS } = require('../../../constants');

const REVIEW_INCLUDE = {
  customer: { select: { id: true, fullName: true, email: true, profileImage: true } },
  business: { select: { id: true, name: true, ownerId: true } },
  branch: { select: { id: true, name: true } },
  service: { select: { id: true, name: true } },
  product: { select: { id: true, name: true } },
  driver: { select: { id: true, fullName: true, driverId: true, rating: true } },
  booking: { select: { id: true, bookingNumber: true, status: true } },
  order: { select: { id: true, orderNumber: true, status: true } },
  reply: {
    include: { user: { select: { id: true, fullName: true } } },
  },
};

class ReviewRepository {
  async create(data) {
    return prisma.review.create({ data, include: REVIEW_INCLUDE });
  }

  async findById(id) {
    return prisma.review.findFirst({
      where: { id, deletedAt: null, status: { not: REVIEW_STATUS.DELETED } },
      include: REVIEW_INCLUDE,
    });
  }

  async findByBookingId(bookingId) {
    return prisma.review.findFirst({
      where: { bookingId, deletedAt: null, status: { not: REVIEW_STATUS.DELETED } },
    });
  }

  async findByOrderId(orderId) {
    return prisma.review.findFirst({
      where: { orderId, deletedAt: null, status: { not: REVIEW_STATUS.DELETED } },
    });
  }

  async findAll({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search,
    customerId,
    businessId,
    businessIds,
    driverId,
    productId,
    serviceId,
    status,
    minRating,
    maxRating,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) {
    const skip = (page - 1) * limit;
    const where = { deletedAt: null, status: { not: REVIEW_STATUS.DELETED } };

    if (customerId) where.customerId = customerId;
    if (businessId) where.businessId = businessId;
    if (businessIds) where.businessId = { in: businessIds };
    if (driverId) where.driverId = driverId;
    if (productId) where.productId = productId;
    if (serviceId) where.serviceId = serviceId;
    if (status) where.status = status;

    if (minRating !== undefined || maxRating !== undefined) {
      where.overallRating = {};
      if (minRating !== undefined) where.overallRating.gte = minRating;
      if (maxRating !== undefined) where.overallRating.lte = maxRating;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { reviewId: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { customer: { fullName: { contains: search, mode: 'insensitive' } } },
        { business: { name: { contains: search, mode: 'insensitive' } } },
        { driver: { fullName: { contains: search, mode: 'insensitive' } } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { booking: { bookingNumber: { contains: search, mode: 'insensitive' } } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: REVIEW_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    return {
      reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async update(id, data) {
    return prisma.review.update({ where: { id }, data, include: REVIEW_INCLUDE });
  }

  async softDelete(id, updatedBy) {
    return prisma.review.update({
      where: { id },
      data: { status: REVIEW_STATUS.DELETED, deletedAt: new Date(), updatedBy },
      include: REVIEW_INCLUDE,
    });
  }

  async findLike(reviewId, userId) {
    return prisma.reviewLike.findUnique({
      where: { reviewId_userId: { reviewId, userId } },
    });
  }

  async createLike(reviewId, userId) {
    return prisma.reviewLike.create({ data: { reviewId, userId } });
  }

  async deleteLike(reviewId, userId) {
    return prisma.reviewLike.delete({
      where: { reviewId_userId: { reviewId, userId } },
    });
  }

  async findReport(reviewId, userId) {
    return prisma.reviewReport.findUnique({
      where: { reviewId_userId: { reviewId, userId } },
    });
  }

  async createReport(data) {
    return prisma.reviewReport.create({ data });
  }

  async createReply(data) {
    return prisma.reviewReply.create({
      data,
      include: { user: { select: { id: true, fullName: true } } },
    });
  }

  async getAverageRating(where) {
    const result = await prisma.review.aggregate({
      where: { ...where, deletedAt: null, status: REVIEW_STATUS.PUBLISHED },
      _avg: { overallRating: true },
      _count: true,
    });
    return {
      averageRating: Number((result._avg.overallRating || 0).toFixed(2)),
      totalReviews: result._count,
    };
  }

  async getDashboard() {
    const [businessRatings, driverRatings, productRatings, topBusinesses, lowestBusinesses] =
      await Promise.all([
        this.getAverageRating({ businessId: { not: null } }),
        this.getAverageRating({ driverId: { not: null } }),
        this.getAverageRating({ productId: { not: null } }),
        prisma.review.groupBy({
          by: ['businessId'],
          where: {
            businessId: { not: null },
            deletedAt: null,
            status: REVIEW_STATUS.PUBLISHED,
          },
          _avg: { overallRating: true },
          _count: true,
          orderBy: { _avg: { overallRating: 'desc' } },
          take: 5,
        }),
        prisma.review.groupBy({
          by: ['businessId'],
          where: {
            businessId: { not: null },
            deletedAt: null,
            status: REVIEW_STATUS.PUBLISHED,
          },
          _avg: { overallRating: true },
          _count: true,
          orderBy: { _avg: { overallRating: 'asc' } },
          take: 5,
        }),
      ]);

    return {
      businessRating: businessRatings,
      driverRating: driverRatings,
      productRating: productRatings,
      topRatedBusinesses: topBusinesses,
      lowestRatedBusinesses: lowestBusinesses,
    };
  }
}

module.exports = new ReviewRepository();
