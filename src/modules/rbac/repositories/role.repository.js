/**
 * Role Repository
 * Handles all database operations for roles
 */

const { prisma } = require('../../../prisma');
const { ROLE_STATUS, PAGINATION } = require('../../../constants');

class RoleRepository {
  /**
   * Create a new role
   */
  async create(data) {
    return prisma.role.create({
      data,
    });
  }

  /**
   * Find a role by ID
   */
  async findById(id, includePermissions = false) {
    const include = {};
    if (includePermissions) {
      include.rolePermissions = {
        include: { permission: true },
      };
    }

    return prisma.role.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include,
    });
  }

  /**
   * Find a role by name
   */
  async findByName(name) {
    return prisma.role.findFirst({
      where: {
        name,
        deletedAt: null,
      },
    });
  }

  /**
   * Find all roles with pagination, filters, and sorting
   */
  async findAll({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const skip = (page - 1) * limit;
    const where = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        include: {
          _count: {
            select: { users: true, rolePermissions: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.role.count({ where }),
    ]);

    return {
      roles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a role
   */
  async update(id, data) {
    return prisma.role.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete a role
   */
  async delete(id) {
    return prisma.role.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Assign permissions to a role
   */
  async assignPermissions(roleId, permissionIds) {
    const existing = await prisma.rolePermission.findMany({
      where: { roleId },
      select: { permissionId: true },
    });
    const existingIds = existing.map((p) => p.permissionId);

    const toCreate = permissionIds.filter((id) => !existingIds.includes(id));
    const toDelete = existingIds.filter((id) => !permissionIds.includes(id));

    return prisma.$transaction(async (tx) => {
      if (toCreate.length > 0) {
        await tx.rolePermission.createMany({
          data: toCreate.map((permissionId) => ({
            roleId,
            permissionId,
          })),
        });
      }

      if (toDelete.length > 0) {
        await tx.rolePermission.deleteMany({
          where: {
            roleId,
            permissionId: { in: toDelete },
          },
        });
      }

      return tx.role.findUnique({
        where: { id: roleId },
        include: {
          rolePermissions: { include: { permission: true } },
        },
      });
    });
  }

  /**
   * Remove a specific permission from a role
   */
  async removePermission(roleId, permissionId) {
    return prisma.rolePermission.delete({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
    });
  }
}

module.exports = new RoleRepository();
