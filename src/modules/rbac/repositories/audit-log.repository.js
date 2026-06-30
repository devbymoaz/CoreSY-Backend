/**
 * Audit Log Repository
 * Handles all database operations for audit logs
 */

const { prisma } = require('../../../prisma');
const { PAGINATION } = require('../../../constants');

class AuditLogRepository {
  /**
   * Create a new audit log
   */
  async create(data) {
    return prisma.auditLog.create({
      data,
    });
  }

  /**
   * Find an audit log by ID
   */
  async findById(id) {
    return prisma.auditLog.findUnique({
      where: { id },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
  }

  /**
   * Find all audit logs with pagination, filters, and sorting
   */
  async findAll({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    userId,
    module,
    action,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const skip = (page - 1) * limit;
    const where = {};

    if (userId) {
      where.userId = userId;
    }

    if (module) {
      where.module = module;
    }

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, fullName: true, email: true } } },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      auditLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new AuditLogRepository();
