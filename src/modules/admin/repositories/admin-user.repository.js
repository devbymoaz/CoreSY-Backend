/**
 * Admin user management repository.
 */

const { prisma } = require('../../../prisma');
const { PAGINATION, ROLES } = require('../../../constants');

const USER_INCLUDE = {
  role: { select: { id: true, name: true } },
  governorate: { select: { id: true, name: true, code: true } },
  userRoles: {
    include: { role: { select: { id: true, name: true } } },
  },
};

class AdminUserRepository {
  async findAll({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search,
    status,
    banType,
    governorateId,
    role,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) {
    const pageNum = Math.max(1, Number(page) || PAGINATION.DEFAULT_PAGE);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || PAGINATION.DEFAULT_LIMIT));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      deletedAt: null,
      role: { name: { notIn: [ROLES.SUPER_ADMIN, ROLES.SUPPORT_ADMIN, ROLES.FINANCE_ADMIN] } },
    };

    if (status) where.status = status;
    if (banType) where.banType = banType;
    if (governorateId) where.governorateId = governorateId;
    if (role) {
      where.OR = [
        { role: { name: role } },
        { userRoles: { some: { role: { name: role } } } },
      ];
    }
    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search, mode: 'insensitive' } },
            { passId: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: USER_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  async findById(id) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: USER_INCLUDE,
    });
  }

  async update(id, data) {
    return prisma.user.update({
      where: { id },
      data,
      include: USER_INCLUDE,
    });
  }

  async findHistory(userId, { page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = { userId };
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      history: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    };
  }
}

module.exports = new AdminUserRepository();
