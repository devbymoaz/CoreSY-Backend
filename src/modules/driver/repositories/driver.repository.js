/**
 * Driver repository.
 * Data access layer for CoreSY Go drivers.
 */

const { prisma } = require('../../../prisma');
const { PAGINATION, DRIVER_STATUS, DRIVER_AVAILABILITY_STATUS } = require('../../../constants');

const DRIVER_SAFE_SELECT = {
  id: true,
  driverId: true,
  fullName: true,
  email: true,
  phoneNumber: true,
  profilePhoto: true,
  dateOfBirth: true,
  gender: true,
  nationalId: true,
  drivingLicense: true,
  nationalIdDocument: true,
  drivingLicenseDocument: true,
  insuranceDocument: true,
  vehicleType: true,
  vehicleBrand: true,
  vehicleModel: true,
  vehicleRegistrationNumber: true,
  vehiclePlateNumber: true,
  vehicleImages: true,
  status: true,
  availabilityStatus: true,
  isOnline: true,
  rating: true,
  totalDeliveries: true,
  completedDeliveries: true,
  cancelledDeliveries: true,
  currentLatitude: true,
  currentLongitude: true,
  locationUpdatedAt: true,
  governorateId: true,
  governorate: true,
  rejectionReason: true,
  approvedAt: true,
  approvedBy: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
};

class DriverRepository {
  async create(data) {
    return prisma.driver.create({
      data,
      select: DRIVER_SAFE_SELECT,
    });
  }

  async findById(id) {
    return prisma.driver.findFirst({
      where: { id, deletedAt: null },
      select: DRIVER_SAFE_SELECT,
    });
  }

  async findByIdWithPassword(id) {
    return prisma.driver.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByEmail(email) {
    return prisma.driver.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async findByPhone(phoneNumber) {
    return prisma.driver.findFirst({
      where: { phoneNumber, deletedAt: null },
    });
  }

  async findByEmailOrPhone(identifier) {
    return prisma.driver.findFirst({
      where: {
        deletedAt: null,
        OR: [{ email: identifier }, { phoneNumber: identifier }],
      },
    });
  }

  async findByNationalId(nationalId, excludeId = null) {
    const where = { nationalId, deletedAt: null };
    if (excludeId) where.id = { not: excludeId };
    return prisma.driver.findFirst({ where });
  }

  async findByDrivingLicense(drivingLicense, excludeId = null) {
    const where = { drivingLicense, deletedAt: null };
    if (excludeId) where.id = { not: excludeId };
    return prisma.driver.findFirst({ where });
  }

  async findByVehicleRegistration(vehicleRegistrationNumber, excludeId = null) {
    const where = { vehicleRegistrationNumber, deletedAt: null };
    if (excludeId) where.id = { not: excludeId };
    return prisma.driver.findFirst({ where });
  }

  async findByVehiclePlate(vehiclePlateNumber, excludeId = null) {
    const where = { vehiclePlateNumber, deletedAt: null };
    if (excludeId) where.id = { not: excludeId };
    return prisma.driver.findFirst({ where });
  }

  async findLatestDriverId() {
    return prisma.driver.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { driverId: true },
    });
  }

  async findAll({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search,
    status,
    availabilityStatus,
    vehicleType,
    governorateId,
    minRating,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) {
    const skip = (page - 1) * limit;
    const where = { deletedAt: null };

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        { driverId: { contains: search, mode: 'insensitive' } },
        { vehiclePlateNumber: { contains: search, mode: 'insensitive' } },
        { vehicleRegistrationNumber: { contains: search, mode: 'insensitive' } },
        { governorate: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) where.status = status;
    if (availabilityStatus) where.availabilityStatus = availabilityStatus;
    if (vehicleType) where.vehicleType = vehicleType;
    if (governorateId) where.governorateId = governorateId;
    if (minRating !== undefined) where.rating = { gte: minRating };

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        select: DRIVER_SAFE_SELECT,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.driver.count({ where }),
    ]);

    return {
      drivers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async update(id, data) {
    return prisma.driver.update({
      where: { id },
      data,
      select: DRIVER_SAFE_SELECT,
    });
  }

  async softDelete(id, deletedBy) {
    return prisma.driver.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: DRIVER_STATUS.INACTIVE,
        availabilityStatus: DRIVER_AVAILABILITY_STATUS.OFFLINE,
        isOnline: false,
        updatedBy: deletedBy,
      },
      select: DRIVER_SAFE_SELECT,
    });
  }

  async getDashboardStats() {
    const where = { deletedAt: null };

    const [totalDrivers, activeDrivers, onlineDrivers, busyDrivers, aggregates] = await Promise.all(
      [
        prisma.driver.count({ where }),
        prisma.driver.count({ where: { ...where, status: DRIVER_STATUS.ACTIVE } }),
        prisma.driver.count({
          where: {
            ...where,
            status: DRIVER_STATUS.ACTIVE,
            availabilityStatus: DRIVER_AVAILABILITY_STATUS.ONLINE,
          },
        }),
        prisma.driver.count({
          where: {
            ...where,
            availabilityStatus: {
              in: [DRIVER_AVAILABILITY_STATUS.BUSY, DRIVER_AVAILABILITY_STATUS.ON_DELIVERY],
            },
          },
        }),
        prisma.driver.aggregate({
          where,
          _sum: {
            completedDeliveries: true,
            cancelledDeliveries: true,
            totalDeliveries: true,
          },
        }),
      ],
    );

    return {
      totalDrivers,
      activeDrivers,
      onlineDrivers,
      busyDrivers,
      completedDeliveries: aggregates._sum.completedDeliveries || 0,
      cancelledDeliveries: aggregates._sum.cancelledDeliveries || 0,
      totalDeliveries: aggregates._sum.totalDeliveries || 0,
    };
  }

  async getDriverHistory(driverId) {
    const driver = await this.findById(driverId);
    if (!driver) return null;

    return {
      driverId: driver.driverId,
      totalDeliveries: driver.totalDeliveries,
      completedDeliveries: driver.completedDeliveries,
      cancelledDeliveries: driver.cancelledDeliveries,
      rating: driver.rating,
      status: driver.status,
      availabilityStatus: driver.availabilityStatus,
    };
  }
}

module.exports = new DriverRepository();
