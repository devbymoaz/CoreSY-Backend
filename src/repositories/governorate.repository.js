/**
 * Governorate repository.
 * Data access layer for Governorate entity operations.
 */

const { prisma } = require('../config/database');

class GovernorateRepository {
  /**
   * Find governorate by ID.
   * @param {string} id - Governorate UUID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return prisma.governorate.findUnique({
      where: { id },
    });
  }

  /**
   * Find governorate by code.
   * @param {string} code - Governorate code (e.g., DM)
   * @returns {Promise<Object|null>}
   */
  async findByCode(code) {
    return prisma.governorate.findUnique({
      where: { code },
    });
  }

  /**
   * Get all active governorates.
   * @returns {Promise<Object[]>}
   */
  async findAllActive() {
    return prisma.governorate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Atomically increment Pass ID sequence and return formatted Pass ID.
   * @param {string} governorateId - Governorate UUID
   * @returns {Promise<string>} Formatted Pass ID (e.g., DM-000001)
   */
  async generatePassId(governorateId) {
    const governorate = await prisma.governorate.update({
      where: { id: governorateId },
      data: { passIdSequence: { increment: 1 } },
    });

    const sequence = String(governorate.passIdSequence).padStart(6, '0');
    return `${governorate.code}-${sequence}`;
  }
}

module.exports = new GovernorateRepository();
