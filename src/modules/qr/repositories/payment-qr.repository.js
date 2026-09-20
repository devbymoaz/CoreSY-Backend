const { prisma } = require('../../../prisma');
const { PAGINATION } = require('../../../constants');

const INCLUDE = {
  business: { select: { id: true, name: true, ownerId: true } },
  branch: { select: { id: true, name: true } },
  paidBy: { select: { id: true, fullName: true, email: true } },
};

class PaymentQRRepository {
  async create(data) {
    return prisma.paymentQR.create({ data, include: INCLUDE });
  }

  async findById(id) {
    return prisma.paymentQR.findFirst({
      where: { id, deletedAt: null },
      include: INCLUDE,
    });
  }

  async findByToken(token) {
    return prisma.paymentQR.findFirst({
      where: { token, deletedAt: null },
      include: INCLUDE,
    });
  }

  async findByQrId(qrId) {
    return prisma.paymentQR.findFirst({
      where: { qrId, deletedAt: null },
      include: INCLUDE,
    });
  }

  async findAll(query = {}) {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      businessId,
      branchId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;
    const where = { deletedAt: null };
    if (businessId) where.businessId = businessId;
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.paymentQR.findMany({
        where,
        include: INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.paymentQR.count({ where }),
    ]);

    return {
      paymentQrs: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async update(id, data) {
    return prisma.paymentQR.update({ where: { id }, data, include: INCLUDE });
  }
}

module.exports = new PaymentQRRepository();
