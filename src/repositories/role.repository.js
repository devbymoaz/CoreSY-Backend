/**
 * Role repository.
 * Data access layer for Role entity operations.
 */

const { prisma } = require('../config/database');

class RoleRepository {
  /**
   * Find role by name.
   * @param {string} name - Role name (e.g., USER)
   * @returns {Promise<Object|null>}
   */
  async findByName(name) {
    return prisma.role.findUnique({
      where: { name },
    });
  }

  /**
   * Find role by ID.
   * @param {string} id - Role UUID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return prisma.role.findUnique({
      where: { id },
    });
  }
}

module.exports = new RoleRepository();
