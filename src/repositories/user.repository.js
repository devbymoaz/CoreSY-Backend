/**
 * User repository.
 * Data access layer for User entity - abstracts Prisma database operations.
 */

const { prisma } = require('../prisma');

const USER_INCLUDE = {
  role: true,
  governorate: true,
  userRoles: {
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  },
};

class UserRepository {
  /**
   * Find a user by email address.
   * @param {string} email - User email
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      include: USER_INCLUDE,
    });
  }

  /**
   * Find a user by phone number.
   * @param {string} phoneNumber - User phone number
   * @returns {Promise<Object|null>}
   */
  async findByPhone(phoneNumber) {
    return prisma.user.findUnique({
      where: { phoneNumber },
      include: USER_INCLUDE,
    });
  }

  /**
   * Find a user by email or phone number.
   * @param {string} identifier - Email or phone number
   * @returns {Promise<Object|null>}
   */
  async findByEmailOrPhone(identifier) {
    return prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phoneNumber: identifier }],
      },
      include: USER_INCLUDE,
    });
  }

  /**
   * Find a user by ID with relations.
   * @param {string} id - User UUID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      include: USER_INCLUDE,
    });
  }

  /**
   * Check if email exists.
   * @param {string} email - Email to check
   * @returns {Promise<boolean>}
   */
  async emailExists(email) {
    const count = await prisma.user.count({ where: { email } });
    return count > 0;
  }

  /**
   * Check if phone number exists.
   * @param {string} phoneNumber - Phone to check
   * @returns {Promise<boolean>}
   */
  async phoneExists(phoneNumber) {
    const count = await prisma.user.count({ where: { phoneNumber } });
    return count > 0;
  }

  /**
   * Create a new user.
   * @param {Object} userData - User creation data
   * @returns {Promise<Object>}
   */
  async create(userData) {
    return prisma.user.create({
      data: userData,
      include: USER_INCLUDE,
    });
  }

  /**
   * Update a user by ID.
   * @param {string} id - User UUID
   * @param {Object} userData - Fields to update
   * @returns {Promise<Object>}
   */
  async update(id, userData) {
    return prisma.user.update({
      where: { id },
      data: userData,
      include: USER_INCLUDE,
    });
  }
}

module.exports = new UserRepository();
