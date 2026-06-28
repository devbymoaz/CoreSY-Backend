/**
 * Refresh token repository.
 * Data access layer for secure refresh token storage and rotation.
 */

const { prisma } = require('../config/database');

class RefreshTokenRepository {
  /**
   * Create a new refresh token record.
   * @param {Object} data - Token data
   * @returns {Promise<Object>}
   */
  async create(data) {
    return prisma.refreshToken.create({
      data,
    });
  }

  /**
   * Find active refresh token by JTI.
   * @param {string} jti - JWT ID
   * @returns {Promise<Object|null>}
   */
  async findByJti(jti) {
    return prisma.refreshToken.findUnique({
      where: { jti },
      include: { user: { include: { role: true, governorate: true } } },
    });
  }

  /**
   * Revoke a refresh token by JTI.
   * @param {string} jti - JWT ID
   * @returns {Promise<Object>}
   */
  async revokeByJti(jti) {
    return prisma.refreshToken.update({
      where: { jti },
      data: { isRevoked: true },
    });
  }

  /**
   * Revoke all refresh tokens for a user.
   * @param {string} userId - User UUID
   * @returns {Promise<Object>}
   */
  async revokeAllForUser(userId) {
    return prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  /**
   * Delete expired tokens (cleanup job).
   * @returns {Promise<Object>}
   */
  async deleteExpired() {
    return prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}

module.exports = new RefreshTokenRepository();
