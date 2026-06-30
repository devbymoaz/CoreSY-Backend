const { prisma } = require('../../../prisma');
const { PAGINATION, ROLES } = require('../../../constants');

const ADMIN_INCLUDE = {
  role: true,
  governorate: true,
  userRoles: {
    include: {
      role: true,
    },
  },
};

const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN, ROLES.SUPPORT_ADMIN];

class AdminRepository {
  async create(data) {
    return prisma.user.create({
      data,
      include: ADMIN_INCLUDE,
    });
  }

  async findById(id) {
    return prisma.user.findUnique({
      where: {
        id,
        deletedAt: null,
        role: {
          name: {
            in: ADMIN_ROLES,
          },
        },
      },
      include: ADMIN_INCLUDE,
    });
  }

  async findByEmail(email) {
    return prisma.user.findUnique({
      where: {
        email,
        deletedAt: null,
        role: {
          name: {
            in: ADMIN_ROLES,
          },
        },
      },
      include: ADMIN_INCLUDE,
    });
  }

  async findByPhone(phoneNumber) {
    return prisma.user.findUnique({
      where: {
        phoneNumber,
        deletedAt: null,
        role: {
          name: {
            in: ADMIN_ROLES,
          },
        },
      },
      include: ADMIN_INCLUDE,
    });
  }

  async findAll({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search,
    role,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const skip = (page - 1) * limit;
    const where = {
      deletedAt: null,
      role: {
        name: {
          in: ADMIN_ROLES,
        },
      },
    };

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
      ];
    }

    if (role) {
      where.role = {
        name: role,
      };
    }

    if (status) {
      where.status = status;
    }

    const [admins, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: ADMIN_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      admins,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async update(id, data) {
    return prisma.user.update({
      where: { id },
      data,
      include: ADMIN_INCLUDE,
    });
  }

  async softDelete(id, deletedBy) {
    return prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: deletedBy,
      },
      include: ADMIN_INCLUDE,
    });
  }

  async getDashboardStats() {
    const where = {
      deletedAt: null,
      role: {
        name: {
          in: ADMIN_ROLES,
        },
      },
    };

    const [totalAdmins, activeAdmins, suspendedAdmins, financeAdmins, supportAdmins, recentAdmins] =
      await Promise.all([
        prisma.user.count({ where }),
        prisma.user.count({ where: { ...where, status: 'ACTIVE' } }),
        prisma.user.count({ where: { ...where, status: 'SUSPENDED' } }),
        prisma.user.count({ where: { ...where, role: { name: ROLES.FINANCE_ADMIN } } }),
        prisma.user.count({ where: { ...where, role: { name: ROLES.SUPPORT_ADMIN } } }),
        prisma.user.findMany({
          where,
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: ADMIN_INCLUDE,
        }),
      ]);

    return {
      totalAdmins,
      activeAdmins,
      suspendedAdmins,
      financeAdmins,
      supportAdmins,
      recentAdmins,
    };
  }

  async getNotifications(userId) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getUnreadNotificationCount(userId) {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
}

module.exports = new AdminRepository();
