/**
 * Order repository.
 * Data access for master orders, business sub-orders, items, and invoices.
 */

const { prisma } = require('../../../prisma');
const { PAGINATION, ORDER_STATUS, DRIVER_STATUS, DRIVER_AVAILABILITY_STATUS } = require('../../../constants');

const ORDER_INCLUDE = {
  customer: {
    select: { id: true, fullName: true, email: true, phoneNumber: true, subscription: true },
  },
  deliveryAddress: {
    include: { governorate: true },
  },
  businessOrders: {
    include: {
      business: { select: { id: true, name: true, ownerId: true, type: true } },
      branch: { select: { id: true, name: true, code: true } },
      driver: {
        select: {
          id: true,
          driverId: true,
          fullName: true,
          phoneNumber: true,
          rating: true,
          vehicleType: true,
          vehiclePlateNumber: true,
        },
      },
      items: {
        include: {
          product: {
            select: { id: true, name: true, sku: true, images: true, status: true },
          },
        },
      },
    },
  },
  items: {
    include: {
      product: {
        select: { id: true, name: true, sku: true, images: true },
      },
      business: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
  },
};

const BUSINESS_ORDER_INCLUDE = {
  order: {
    include: {
      customer: {
        select: { id: true, fullName: true, email: true, phoneNumber: true },
      },
      deliveryAddress: { include: { governorate: true } },
    },
  },
  business: { select: { id: true, name: true, ownerId: true } },
  branch: { select: { id: true, name: true, code: true, latitude: true, longitude: true } },
  driver: {
    select: {
      id: true,
      driverId: true,
      fullName: true,
      phoneNumber: true,
      rating: true,
      vehicleType: true,
      vehiclePlateNumber: true,
      currentLatitude: true,
      currentLongitude: true,
      availabilityStatus: true,
    },
  },
  items: {
    include: {
      product: { select: { id: true, name: true, sku: true, images: true } },
    },
  },
};

class OrderRepository {
  async create(data) {
    return prisma.order.create({
      data,
      include: ORDER_INCLUDE,
    });
  }

  async findById(id) {
    return prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: ORDER_INCLUDE,
    });
  }

  async findByOrderNumber(orderNumber) {
    return prisma.order.findFirst({
      where: { orderNumber, deletedAt: null },
      include: ORDER_INCLUDE,
    });
  }

  async findBusinessOrderById(id) {
    return prisma.businessOrder.findUnique({
      where: { id },
      include: BUSINESS_ORDER_INCLUDE,
    });
  }

  async findLatestOrderNumber(prefix) {
    return prisma.order.findFirst({
      where: { orderNumber: { startsWith: prefix } },
      orderBy: { createdAt: 'desc' },
      select: { orderNumber: true },
    });
  }

  async findAll({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search,
    customerId,
    businessId,
    businessIds,
    status,
    paymentStatus,
    fulfillmentType,
    startDate,
    endDate,
    historyOnly = false,
    upcomingOnly = false,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) {
    const pageNum = Math.max(1, Number(page) || PAGINATION.DEFAULT_PAGE);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || PAGINATION.DEFAULT_LIMIT));
    const skip = (pageNum - 1) * limitNum;
    const where = { deletedAt: null };

    if (customerId) where.customerId = customerId;

    if (businessId || businessIds) {
      where.businessOrders = {
        some: {
          businessId: businessIds ? { in: businessIds } : businessId,
        },
      };
    }

    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (fulfillmentType) where.fulfillmentType = fulfillmentType;

    if (historyOnly) {
      where.status = {
        in: [
          ORDER_STATUS.DELIVERED,
          ORDER_STATUS.CANCELLED,
          ORDER_STATUS.REJECTED,
          ORDER_STATUS.REFUNDED,
        ],
      };
    }

    if (upcomingOnly) {
      where.status = {
        in: [
          ORDER_STATUS.PENDING,
          ORDER_STATUS.ACCEPTED,
          ORDER_STATUS.PREPARING,
          ORDER_STATUS.READY,
          ORDER_STATUS.ASSIGNED,
          ORDER_STATUS.PICKED_UP,
          ORDER_STATUS.ON_THE_WAY,
        ],
      };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customer: { fullName: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
        { customer: { phoneNumber: { contains: search, mode: 'insensitive' } } },
        {
          businessOrders: {
            some: {
              business: { name: { contains: search, mode: 'insensitive' } },
            },
          },
        },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limitNum,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  async findBusinessOrders({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    businessId,
    businessIds,
    branchId,
    status,
    fulfillmentType,
    todayOnly = false,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) {
    const pageNum = Math.max(1, Number(page) || PAGINATION.DEFAULT_PAGE);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || PAGINATION.DEFAULT_LIMIT));
    const skip = (pageNum - 1) * limitNum;
    const where = {};

    if (businessId) where.businessId = businessId;
    if (businessIds) where.businessId = { in: businessIds };
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    if (fulfillmentType) where.order = { ...(where.order || {}), fulfillmentType };

    if (todayOnly) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }

    if (search) {
      where.OR = [
        { businessOrderNumber: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
        { order: { customer: { fullName: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [businessOrders, total] = await Promise.all([
      prisma.businessOrder.findMany({
        where,
        include: BUSINESS_ORDER_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limitNum,
      }),
      prisma.businessOrder.count({ where }),
    ]);

    return {
      businessOrders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  async findDriverOrders({
    driverId,
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    status,
    historyOnly = false,
    activeOnly = false,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) {
    const pageNum = Math.max(1, Number(page) || PAGINATION.DEFAULT_PAGE);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || PAGINATION.DEFAULT_LIMIT));
    const skip = (pageNum - 1) * limitNum;
    const where = { driverId };

    if (status) {
      where.status = status;
    } else if (historyOnly) {
      where.status = {
        in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED],
      };
    } else if (activeOnly) {
      where.status = {
        in: [
          ORDER_STATUS.ASSIGNED,
          ORDER_STATUS.PICKED_UP,
          ORDER_STATUS.ON_THE_WAY,
        ],
      };
    }

    const [businessOrders, total] = await Promise.all([
      prisma.businessOrder.findMany({
        where,
        include: BUSINESS_ORDER_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limitNum,
      }),
      prisma.businessOrder.count({ where }),
    ]);

    return {
      businessOrders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  async findAvailableDrivers({ governorateId, excludeDriverIds = [] } = {}) {
    const where = {
      deletedAt: null,
      status: DRIVER_STATUS.ACTIVE,
      availabilityStatus: DRIVER_AVAILABILITY_STATUS.ONLINE,
      isOnline: true,
    };
    if (governorateId) where.governorateId = governorateId;
    if (excludeDriverIds.length) where.id = { notIn: excludeDriverIds };

    return prisma.driver.findMany({
      where,
      select: {
        id: true,
        driverId: true,
        fullName: true,
        phoneNumber: true,
        rating: true,
        vehicleType: true,
        vehiclePlateNumber: true,
        vehicleBrand: true,
        vehicleModel: true,
        currentLatitude: true,
        currentLongitude: true,
        governorateId: true,
        availabilityStatus: true,
        totalDeliveries: true,
        completedDeliveries: true,
      },
      orderBy: [{ rating: 'desc' }, { completedDeliveries: 'desc' }],
      take: 50,
    });
  }

  async update(id, data) {
    return prisma.order.update({
      where: { id },
      data,
      include: ORDER_INCLUDE,
    });
  }

  async updateBusinessOrder(id, data) {
    return prisma.businessOrder.update({
      where: { id },
      data,
      include: BUSINESS_ORDER_INCLUDE,
    });
  }

  async getCustomerDashboard(customerId) {
    const where = { customerId, deletedAt: null };
    const upcomingStatuses = [
      ORDER_STATUS.PENDING,
      ORDER_STATUS.ACCEPTED,
      ORDER_STATUS.PREPARING,
      ORDER_STATUS.READY,
      ORDER_STATUS.ASSIGNED,
      ORDER_STATUS.PICKED_UP,
      ORDER_STATUS.ON_THE_WAY,
    ];

    const [upcomingOrders, completedOrders, cancelledOrders, totalOrders] = await Promise.all([
      prisma.order.count({ where: { ...where, status: { in: upcomingStatuses } } }),
      prisma.order.count({ where: { ...where, status: ORDER_STATUS.DELIVERED } }),
      prisma.order.count({
        where: {
          ...where,
          status: { in: [ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED] },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return { totalOrders, upcomingOrders, completedOrders, cancelledOrders };
  }

  async getBusinessDashboard({ businessId, businessIds, branchId } = {}) {
    const where = {};
    if (businessId) where.businessId = businessId;
    if (businessIds) where.businessId = { in: businessIds };
    if (branchId) where.branchId = branchId;

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const [todaysOrders, preparing, ready, completed, cancelled, pending, accepted] =
      await Promise.all([
        prisma.businessOrder.count({ where: { ...where, createdAt: { gte: start, lte: end } } }),
        prisma.businessOrder.count({ where: { ...where, status: ORDER_STATUS.PREPARING } }),
        prisma.businessOrder.count({ where: { ...where, status: ORDER_STATUS.READY } }),
        prisma.businessOrder.count({ where: { ...where, status: ORDER_STATUS.DELIVERED } }),
        prisma.businessOrder.count({
          where: {
            ...where,
            status: { in: [ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED] },
          },
        }),
        prisma.businessOrder.count({ where: { ...where, status: ORDER_STATUS.PENDING } }),
        prisma.businessOrder.count({ where: { ...where, status: ORDER_STATUS.ACCEPTED } }),
      ]);

    return {
      todaysOrders,
      pending,
      accepted,
      preparing,
      ready,
      completed,
      cancelled,
    };
  }
}

module.exports = new OrderRepository();
