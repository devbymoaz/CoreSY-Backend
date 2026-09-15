/**
 * Pending registration repository.
 * Temporary signup records until email OTP verification creates a real User.
 */

const { prisma } = require('../prisma');

class PendingRegistrationRepository {
  async findByEmail(email) {
    return prisma.pendingRegistration.findUnique({ where: { email } });
  }

  async findByPhone(phoneNumber) {
    return prisma.pendingRegistration.findUnique({ where: { phoneNumber } });
  }

  async findById(id) {
    return prisma.pendingRegistration.findUnique({ where: { id } });
  }

  async upsertByEmail(data) {
    return prisma.pendingRegistration.upsert({
      where: { email: data.email },
      create: data,
      update: {
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        smartAssistantName: data.smartAssistantName,
        password: data.password,
        governorateId: data.governorateId,
        acceptTerms: data.acceptTerms,
        expiresAt: data.expiresAt,
      },
    });
  }

  async deleteById(id) {
    return prisma.pendingRegistration.delete({ where: { id } });
  }

  async deleteByEmail(email) {
    return prisma.pendingRegistration.deleteMany({ where: { email } });
  }

  async deleteExpired(before = new Date()) {
    return prisma.pendingRegistration.deleteMany({
      where: { expiresAt: { lt: before } },
    });
  }
}

module.exports = new PendingRegistrationRepository();
