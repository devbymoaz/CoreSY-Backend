/**
 * Order QR repository.
 */

const { prisma } = require('../../../prisma');

const ORDER_QR_INCLUDE = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      fulfillmentType: true,
      paymentStatus: true,
      paymentMethod: true,
      status: true,
      grandTotal: true,
      customerId: true,
    },
  },
  businessOrder: {
    select: {
      id: true,
      businessOrderNumber: true,
      status: true,
      driverId: true,
      total: true,
      driverAcceptedAt: true,
    },
  },
};

class OrderQRRepository {
  async create(data) {
    return prisma.orderQR.create({
      data,
      include: ORDER_QR_INCLUDE,
    });
  }

  async createMany(dataList) {
    return prisma.$transaction(
      dataList.map((data) =>
        prisma.orderQR.create({
          data,
          include: ORDER_QR_INCLUDE,
        }),
      ),
    );
  }

  async findById(id) {
    return prisma.orderQR.findUnique({
      where: { id },
      include: ORDER_QR_INCLUDE,
    });
  }

  async findByToken(token) {
    return prisma.orderQR.findUnique({
      where: { token },
      include: ORDER_QR_INCLUDE,
    });
  }

  async findByQrId(qrId) {
    return prisma.orderQR.findUnique({
      where: { qrId },
      include: ORDER_QR_INCLUDE,
    });
  }

  async findByOrderId(orderId) {
    return prisma.orderQR.findMany({
      where: { orderId },
      include: ORDER_QR_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByBusinessOrderId(businessOrderId) {
    return prisma.orderQR.findMany({
      where: { businessOrderId },
      include: ORDER_QR_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActiveByPurpose(businessOrderId, purpose) {
    return prisma.orderQR.findFirst({
      where: {
        businessOrderId,
        purpose,
        status: { in: ['ACTIVE', 'SCANNED'] },
      },
      include: ORDER_QR_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id, data) {
    return prisma.orderQR.update({
      where: { id },
      data,
      include: ORDER_QR_INCLUDE,
    });
  }

  async cancelActiveByPurpose(businessOrderId, purpose) {
    return prisma.orderQR.updateMany({
      where: {
        businessOrderId,
        purpose,
        status: 'ACTIVE',
      },
      data: { status: 'CANCELLED' },
    });
  }
}

module.exports = new OrderQRRepository();
