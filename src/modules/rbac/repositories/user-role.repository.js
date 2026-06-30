/**
 * User Role Repository
 * Handles all database operations for user-role relationships
 */

const { prisma } = require('../../../prisma');

class UserRoleRepository {
  /**
   * Assign roles to a user
   */
  async assignRoles(userId, roleIds) {
    return prisma.$transaction(async (tx) => {
      // Remove all existing roles
      await tx.userRole.deleteMany({
        where: { userId },
      });

      // Assign new roles
      const userRoles = await Promise.all(
        roleIds.map(async (roleId) => {
          return tx.userRole.create({
            data: {
              userId,
              roleId,
            },
          });
        }),
      );

      return userRoles;
    });
  }

  /**
   * Get all roles for a user
   */
  async getUserRoles(userId) {
    return prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
  }

  /**
   * Check if user has a specific role
   */
  async userHasRole(userId, roleName) {
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId,
        role: { name: roleName },
      },
    });
    return !!userRole;
  }
}

module.exports = new UserRoleRepository();
