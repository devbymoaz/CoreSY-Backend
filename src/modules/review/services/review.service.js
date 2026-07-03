/**
 * Review service.
 * Ratings and reviews for bookings, orders, businesses, products, drivers, and services.
 */

const reviewRepository = require('../repositories/review.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const AppError = require('../../../utils/AppError');
const logger = require('../../../utils/logger');
const { prisma } = require('../../../prisma');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
  REVIEW_STATUS,
  BOOKING_STATUS,
  ORDER_STATUS,
  PERMISSION_MODULES,
} = require('../../../constants');

const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.SUPPORT_ADMIN];

class ReviewService {
  _hasRole(user, roles) {
    return roles.some((role) => user.roles?.includes(role));
  }

  async _audit(userId, action, payload, ipAddress, userAgent) {
    const entry = {
      userId,
      action,
      module: PERMISSION_MODULES.REVIEWS,
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
    if (!userId) return;
    try {
      await prisma.notification.create({ data: { userId, title, message, type, data } });
    } catch (error) {
      logger.error('Failed to create review notification:', error);
    }
  }

  async _updateAggregates({ businessId, driverId, productId, serviceId }) {
    if (driverId) {
      const stats = await reviewRepository.getAverageRating({ driverId });
      await prisma.driver.update({
        where: { id: driverId },
        data: { rating: stats.averageRating },
      });
    }
    // Business/product/service ratings are computed from reviews for dashboards.
    return { businessId, driverId, productId, serviceId };
  }

  async createReview(data, userId, ipAddress, userAgent, user) {
    if (!this._hasRole(user, [ROLES.USER, ROLES.SUPER_ADMIN])) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    let businessId = data.businessId || null;
    let branchId = data.branchId || null;
    let serviceId = data.serviceId || null;
    let productId = data.productId || null;
    const driverId = data.driverId || null;

    if (data.bookingId) {
      const existing = await reviewRepository.findByBookingId(data.bookingId);
      if (existing) throw new AppError(ERROR_MESSAGES.REVIEW_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);

      const booking = await prisma.booking.findFirst({
        where: { id: data.bookingId, deletedAt: null },
      });
      if (!booking) throw new AppError(ERROR_MESSAGES.BOOKING_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      if (booking.customerId !== userId && !this._hasRole(user, ADMIN_ROLES)) {
        throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
      }
      if (booking.status !== BOOKING_STATUS.COMPLETED) {
        throw new AppError(ERROR_MESSAGES.REVIEW_NOT_ALLOWED, HTTP_STATUS.BAD_REQUEST);
      }

      businessId = booking.businessId;
      branchId = booking.branchId;
      serviceId = booking.serviceId;
    }

    if (data.orderId) {
      const existing = await reviewRepository.findByOrderId(data.orderId);
      if (existing) throw new AppError(ERROR_MESSAGES.REVIEW_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);

      const order = await prisma.order.findFirst({
        where: { id: data.orderId, deletedAt: null },
        include: { businessOrders: true, items: true },
      });
      if (!order) throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      if (order.customerId !== userId && !this._hasRole(user, ADMIN_ROLES)) {
        throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
      }
      if (order.status !== ORDER_STATUS.DELIVERED) {
        throw new AppError(ERROR_MESSAGES.REVIEW_NOT_ALLOWED, HTTP_STATUS.BAD_REQUEST);
      }

      businessId = order.businessOrders[0]?.businessId || businessId;
      branchId = order.businessOrders[0]?.branchId || branchId;
      productId = data.productId || order.items[0]?.productId || productId;
    }

    if (!data.bookingId && !data.orderId) {
      throw new AppError(ERROR_MESSAGES.REVIEW_NOT_ALLOWED, HTTP_STATUS.BAD_REQUEST);
    }

    const review = await reviewRepository.create({
      reviewId: `REV-${Date.now()}${Math.floor(Math.random() * 1000)}`,
      customerId: userId,
      businessId,
      branchId,
      serviceId,
      productId,
      driverId,
      bookingId: data.bookingId || null,
      orderId: data.orderId || null,
      overallRating: data.overallRating,
      serviceRating: data.serviceRating ?? null,
      qualityRating: data.qualityRating ?? null,
      cleanlinessRating: data.cleanlinessRating ?? null,
      deliveryRating: data.deliveryRating ?? null,
      communicationRating: data.communicationRating ?? null,
      title: data.title || null,
      description: data.description || null,
      images: data.images || [],
      status: REVIEW_STATUS.PUBLISHED,
      createdBy: userId,
    });

    await this._updateAggregates({ businessId, driverId, productId, serviceId });
    await this._audit(userId, 'REVIEW_CREATED', { reviewId: review.id }, ipAddress, userAgent);

    if (businessId) {
      const business = await prisma.business.findUnique({ where: { id: businessId } });
      if (business?.ownerId) {
        await this._notify(
          business.ownerId,
          'Review Submitted',
          `A new review was submitted for your business.`,
          'REVIEW_SUBMITTED',
          { reviewId: review.id },
        );
      }
    }

    return { message: SUCCESS_MESSAGES.REVIEW_CREATED, review };
  }

  async getReviews(query, user) {
    const filters = { ...query };
    if (
      this._hasRole(user, [ROLES.USER]) &&
      !this._hasRole(user, ADMIN_ROLES.concat([ROLES.BUSINESS_OWNER]))
    ) {
      filters.customerId = user.id;
    }
    if (!filters.status && !this._hasRole(user, ADMIN_ROLES)) {
      filters.status = REVIEW_STATUS.PUBLISHED;
    }
    return reviewRepository.findAll(filters);
  }

  async getReviewById(id, user) {
    const review = await reviewRepository.findById(id);
    if (!review) throw new AppError(ERROR_MESSAGES.REVIEW_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const isOwner = review.customerId === user.id;
    const isBusinessOwner =
      this._hasRole(user, [ROLES.BUSINESS_OWNER]) && review.business?.ownerId === user.id;
    const isAdmin = this._hasRole(user, ADMIN_ROLES);

    if (review.status !== REVIEW_STATUS.PUBLISHED && !isOwner && !isBusinessOwner && !isAdmin) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    return review;
  }

  async updateReview(id, data, userId, ipAddress, userAgent, user) {
    const review = await reviewRepository.findById(id);
    if (!review) throw new AppError(ERROR_MESSAGES.REVIEW_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    if (review.customerId !== userId && !this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const updated = await reviewRepository.update(id, {
      ...data,
      updatedBy: userId,
    });

    await this._updateAggregates({
      businessId: updated.businessId,
      driverId: updated.driverId,
      productId: updated.productId,
      serviceId: updated.serviceId,
    });
    await this._audit(userId, 'REVIEW_UPDATED', { reviewId: id }, ipAddress, userAgent);

    return { message: SUCCESS_MESSAGES.REVIEW_UPDATED, review: updated };
  }

  async deleteReview(id, userId, ipAddress, userAgent, user) {
    const review = await reviewRepository.findById(id);
    if (!review) throw new AppError(ERROR_MESSAGES.REVIEW_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const isOwner = review.customerId === userId;
    const isAdmin = this._hasRole(user, ADMIN_ROLES);
    if (!isOwner && !isAdmin) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    await reviewRepository.softDelete(id, userId);
    await this._updateAggregates({
      businessId: review.businessId,
      driverId: review.driverId,
      productId: review.productId,
      serviceId: review.serviceId,
    });
    await this._audit(userId, 'REVIEW_DELETED', { reviewId: id }, ipAddress, userAgent);

    return { message: SUCCESS_MESSAGES.REVIEW_DELETED };
  }

  async reportReview(id, reason, userId, ipAddress, userAgent) {
    const review = await reviewRepository.findById(id);
    if (!review) throw new AppError(ERROR_MESSAGES.REVIEW_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const existing = await reviewRepository.findReport(id, userId);
    if (existing) throw new AppError(ERROR_MESSAGES.REVIEW_ALREADY_REPORTED, HTTP_STATUS.CONFLICT);

    await reviewRepository.createReport({ reviewId: id, userId, reason: reason || null });
    await reviewRepository.update(id, { status: REVIEW_STATUS.REPORTED });
    await this._audit(userId, 'REVIEW_REPORTED', { reviewId: id }, ipAddress, userAgent);

    return { message: SUCCESS_MESSAGES.REVIEW_REPORTED };
  }

  async likeReview(id, userId) {
    const review = await reviewRepository.findById(id);
    if (!review) throw new AppError(ERROR_MESSAGES.REVIEW_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const existing = await reviewRepository.findLike(id, userId);
    if (existing) {
      await reviewRepository.deleteLike(id, userId);
      const updated = await reviewRepository.update(id, {
        likesCount: Math.max(review.likesCount - 1, 0),
      });
      return { message: SUCCESS_MESSAGES.REVIEW_UNLIKED, review: updated };
    }

    await reviewRepository.createLike(id, userId);
    const updated = await reviewRepository.update(id, {
      likesCount: review.likesCount + 1,
    });
    return { message: SUCCESS_MESSAGES.REVIEW_LIKED, review: updated };
  }

  async getBusinessReviews(query, user) {
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
    return reviewRepository.findAll(filters);
  }

  async replyToReview(id, message, userId, ipAddress, userAgent, user) {
    const review = await reviewRepository.findById(id);
    if (!review) throw new AppError(ERROR_MESSAGES.REVIEW_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (this._hasRole(user, [ROLES.BUSINESS_OWNER])) {
      if (!review.business || review.business.ownerId !== user.id) {
        throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
      }
    } else if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    if (review.reply) {
      throw new AppError(ERROR_MESSAGES.REVIEW_REPLY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    const reply = await reviewRepository.createReply({
      reviewId: id,
      businessId: review.businessId,
      userId,
      message,
    });

    await this._notify(
      review.customerId,
      'Business Reply',
      'A business replied to your review.',
      'BUSINESS_REPLY',
      { reviewId: id },
    );
    await this._audit(userId, 'REVIEW_REPLIED', { reviewId: id }, ipAddress, userAgent);

    return { message: SUCCESS_MESSAGES.REVIEW_REPLIED, reply };
  }

  async getAdminReviews(query, user) {
    if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
    return reviewRepository.findAll(query);
  }

  async updateStatus(data, userId, ipAddress, userAgent, user) {
    if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const review = await reviewRepository.findById(data.reviewId);
    if (!review) throw new AppError(ERROR_MESSAGES.REVIEW_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const updated = await reviewRepository.update(data.reviewId, {
      status: data.status,
      updatedBy: userId,
    });

    await this._updateAggregates({
      businessId: updated.businessId,
      driverId: updated.driverId,
      productId: updated.productId,
      serviceId: updated.serviceId,
    });
    await this._audit(
      userId,
      'REVIEW_STATUS_UPDATED',
      { reviewId: data.reviewId, status: data.status },
      ipAddress,
      userAgent,
    );

    if (data.status === REVIEW_STATUS.PUBLISHED) {
      await this._notify(
        review.customerId,
        'Review Approved',
        'Your review has been approved.',
        'REVIEW_APPROVED',
        { reviewId: review.id },
      );
    }

    return { message: SUCCESS_MESSAGES.REVIEW_STATUS_UPDATED, review: updated };
  }

  async getDashboard(user) {
    if (!this._hasRole(user, ADMIN_ROLES.concat([ROLES.BUSINESS_OWNER, ROLES.FINANCE_ADMIN]))) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
    return reviewRepository.getDashboard();
  }
}

module.exports = new ReviewService();
