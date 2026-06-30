/**
 * Permission Repository
 * Handles all database operations for permissions
 */

const { prisma } = require('../../../prisma');
const { PERMISSION_STATUS, PAGINATION } = require('../../../constants');

class PermissionRepository {
  /**
   * Create a new permission
   */
  async create(data) {
    return prisma.permission.create({
      data,
    });
  }

  /**
   * Find a permission by ID
   */
  async findById(id) {
    return prisma.permission.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  /**
   * Find a permission by slug
   */
  async findBySlug(slug) {
    return prisma.permission.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
    });
  }

  /**
   * Find all permissions with pagination, filters, and sorting
   */
  async findAll({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search,
    module,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const skip = (page - 1) * limit;
    const where = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (module) {
      where.module = module;
    }

    if (status) {
      where.status = status;
    }

    const [permissions, total] = await Promise.all([
      prisma.permission.findMany({
        where,
        include: {
          _count: {
            select: { rolePermissions: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.permission.count({ where }),
    ]);

    return {
      permissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a permission
   */
  async update(id, data) {
    return prisma.permission.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete a permission
   */
  async delete(id) {
    return prisma.permission.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

module.exports = new PermissionRepository();
