/**
 * Driver service.
 * Business logic for CoreSY Go driver management.
 */

const driverRepository = require('../repositories/driver.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const AppError = require('../../../utils/AppError');
const logger = require('../../../utils/logger');
const { hashPassword, comparePassword } = require('../../../utils/password');
const { generateAccessToken, generateRefreshToken } = require('../../../utils/jwt');
const { prisma } = require('../../../prisma');
const config = require('../../../config');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
  DRIVER_STATUS,
  DRIVER_AVAILABILITY_STATUS,
  PERMISSION_MODULES,
} = require('../../../constants');

const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.SUPPORT_ADMIN];

class DriverService {
  _hasRole(user, roles) {
    return roles.some((role) => user.roles?.includes(role));
  }

  async _audit(userId, action, payload, ipAddress, userAgent) {
    const entry = {
      userId,
      action,
      module: PERMISSION_MODULES.DRIVERS,
      ipAddress,
      userAgent,
      payload,
    };
    if (typeof auditLogService.create === 'function') {
      await auditLogService.create(entry);
    } else {
      await auditLogService.logAction(entry);
    }
  }

  async _notify(userId, title, message, type, data = {}) {
    if (!userId) return;
    try {
      await prisma.notification.create({
        data: { userId, title, message, type, data },
      });
    } catch (error) {
      logger.error('Failed to create driver notification:', error);
    }
  }

  async _generateDriverId() {
    const latest = await driverRepository.findLatestDriverId();
    let nextNumber = 1;
    if (latest?.driverId) {
      const match = latest.driverId.match(/(\d+)$/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }
    return `DRV-${String(nextNumber).padStart(6, '0')}`;
  }

  async _assertUniqueFields(data, excludeId = null) {
    if (data.email) {
      const existing = await driverRepository.findByEmail(data.email);
      if (existing && existing.id !== excludeId) {
        throw new AppError(ERROR_MESSAGES.DRIVER_EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    if (data.phoneNumber) {
      const existing = await driverRepository.findByPhone(data.phoneNumber);
      if (existing && existing.id !== excludeId) {
        throw new AppError(ERROR_MESSAGES.DRIVER_PHONE_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    if (data.nationalId) {
      const existing = await driverRepository.findByNationalId(data.nationalId, excludeId);
      if (existing) {
        throw new AppError(ERROR_MESSAGES.DRIVER_NATIONAL_ID_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    if (data.drivingLicense) {
      const existing = await driverRepository.findByDrivingLicense(data.drivingLicense, excludeId);
      if (existing) {
        throw new AppError(ERROR_MESSAGES.DRIVER_LICENSE_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    if (data.vehicleRegistrationNumber) {
      const existing = await driverRepository.findByVehicleRegistration(
        data.vehicleRegistrationNumber,
        excludeId,
      );
      if (existing) {
        throw new AppError(ERROR_MESSAGES.DRIVER_VEHICLE_REGISTRATION_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    if (data.vehiclePlateNumber) {
      const existing = await driverRepository.findByVehiclePlate(
        data.vehiclePlateNumber,
        excludeId,
      );
      if (existing) {
        throw new AppError(ERROR_MESSAGES.DRIVER_VEHICLE_PLATE_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }
  }

  async register(data, ipAddress, userAgent) {
    const governorate = await prisma.governorate.findUnique({
      where: { id: data.governorateId },
    });
    if (!governorate) {
      throw new AppError(ERROR_MESSAGES.GOVERNORATE_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
    }

    await this._assertUniqueFields(data);

    const driverId = await this._generateDriverId();
    const hashedPassword = await hashPassword(data.password);

    const driver = await driverRepository.create({
      driverId,
      fullName: data.fullName,
      email: data.email.toLowerCase(),
      phoneNumber: data.phoneNumber,
      password: hashedPassword,
      profilePhoto: data.profilePhoto || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      gender: data.gender || null,
      nationalId: data.nationalId,
      drivingLicense: data.drivingLicense,
      nationalIdDocument: data.nationalIdDocument || null,
      drivingLicenseDocument: data.drivingLicenseDocument || null,
      insuranceDocument: data.insuranceDocument || null,
      vehicleType: data.vehicleType,
      vehicleBrand: data.vehicleBrand || null,
      vehicleModel: data.vehicleModel || null,
      vehicleRegistrationNumber: data.vehicleRegistrationNumber,
      vehiclePlateNumber: data.vehiclePlateNumber,
      vehicleImages: data.vehicleImages || [],
      status: DRIVER_STATUS.PENDING_VERIFICATION,
      availabilityStatus: DRIVER_AVAILABILITY_STATUS.OFFLINE,
      isOnline: false,
      governorateId: data.governorateId,
    });

    await this._audit(null, 'DRIVER_REGISTERED', { driverId: driver.id }, ipAddress, userAgent);

    return {
      message: SUCCESS_MESSAGES.DRIVER_REGISTERED,
      driver,
      requiresVerification: true,
    };
  }

  async login(data) {
    const identifier = data.identifier.includes('@')
      ? data.identifier.toLowerCase().trim()
      : data.identifier.trim();

    const driver = await driverRepository.findByEmailOrPhone(identifier);
    if (!driver) {
      throw new AppError(ERROR_MESSAGES.DRIVER_INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    const isValid = await comparePassword(data.password, driver.password);
    if (!isValid) {
      throw new AppError(ERROR_MESSAGES.DRIVER_INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    if (driver.status === DRIVER_STATUS.PENDING_VERIFICATION) {
      throw new AppError(ERROR_MESSAGES.DRIVER_PENDING_VERIFICATION, HTTP_STATUS.FORBIDDEN);
    }
    if (driver.status === DRIVER_STATUS.SUSPENDED) {
      throw new AppError(ERROR_MESSAGES.DRIVER_SUSPENDED, HTTP_STATUS.FORBIDDEN);
    }
    if (driver.status === DRIVER_STATUS.REJECTED) {
      throw new AppError(ERROR_MESSAGES.DRIVER_REJECTED, HTTP_STATUS.FORBIDDEN);
    }
    if (driver.status !== DRIVER_STATUS.ACTIVE) {
      throw new AppError(ERROR_MESSAGES.DRIVER_NOT_ACTIVE, HTTP_STATUS.FORBIDDEN);
    }

    const payload = {
      sub: driver.id,
      email: driver.email,
      role: ROLES.DRIVER,
      type: 'driver',
      driverId: driver.driverId,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({
      sub: driver.id,
      type: 'driver_refresh',
    });

    await driverRepository.update(driver.id, { lastLogin: new Date() });
    const safeDriver = await driverRepository.findById(driver.id);

    return {
      message: SUCCESS_MESSAGES.DRIVER_LOGIN_SUCCESS,
      accessToken,
      refreshToken,
      expiresIn: config.jwt.expiresIn,
      driver: safeDriver,
    };
  }

  async getProfile(driverId) {
    const driver = await driverRepository.findById(driverId);
    if (!driver) throw new AppError(ERROR_MESSAGES.DRIVER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    return driver;
  }

  async updateProfile(driverId, data, ipAddress, userAgent) {
    const driver = await driverRepository.findById(driverId);
    if (!driver) throw new AppError(ERROR_MESSAGES.DRIVER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (data.phoneNumber) {
      await this._assertUniqueFields({ phoneNumber: data.phoneNumber }, driverId);
    }

    if (data.governorateId) {
      const governorate = await prisma.governorate.findUnique({
        where: { id: data.governorateId },
      });
      if (!governorate) {
        throw new AppError(ERROR_MESSAGES.GOVERNORATE_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
      }
    }

    const updateData = { ...data, updatedBy: driverId };
    if (data.dateOfBirth) updateData.dateOfBirth = new Date(data.dateOfBirth);

    const updated = await driverRepository.update(driverId, updateData);
    await this._audit(driverId, 'DRIVER_PROFILE_UPDATED', { driverId }, ipAddress, userAgent);

    return { message: SUCCESS_MESSAGES.DRIVER_PROFILE_UPDATED, driver: updated };
  }

  async uploadDocuments(driverId, data, ipAddress, userAgent) {
    const driver = await driverRepository.findById(driverId);
    if (!driver) throw new AppError(ERROR_MESSAGES.DRIVER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const updated = await driverRepository.update(driverId, {
      ...data,
      updatedBy: driverId,
    });

    await this._audit(driverId, 'DRIVER_DOCUMENTS_UPLOADED', { driverId }, ipAddress, userAgent);
    return { message: SUCCESS_MESSAGES.DRIVER_DOCUMENTS_UPLOADED, driver: updated };
  }

  async uploadVehicle(driverId, data, ipAddress, userAgent) {
    const driver = await driverRepository.findById(driverId);
    if (!driver) throw new AppError(ERROR_MESSAGES.DRIVER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const vehicleImages = [
      ...new Set([...(driver.vehicleImages || []), ...(data.vehicleImages || [])]),
    ].slice(0, 10);

    const updated = await driverRepository.update(driverId, {
      vehicleImages,
      vehicleBrand: data.vehicleBrand ?? driver.vehicleBrand,
      vehicleModel: data.vehicleModel ?? driver.vehicleModel,
      vehicleType: data.vehicleType ?? driver.vehicleType,
      updatedBy: driverId,
    });

    await this._audit(driverId, 'DRIVER_VEHICLE_UPLOADED', { driverId }, ipAddress, userAgent);
    return { message: SUCCESS_MESSAGES.DRIVER_VEHICLE_UPLOADED, driver: updated };
  }

  async updateAvailability(driverId, availabilityStatus, ipAddress, userAgent) {
    const driver = await driverRepository.findById(driverId);
    if (!driver) throw new AppError(ERROR_MESSAGES.DRIVER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (driver.status !== DRIVER_STATUS.ACTIVE) {
      throw new AppError(ERROR_MESSAGES.DRIVER_NOT_ACTIVE, HTTP_STATUS.FORBIDDEN);
    }

    const isOnline = availabilityStatus === DRIVER_AVAILABILITY_STATUS.ONLINE;
    const updated = await driverRepository.update(driverId, {
      availabilityStatus,
      isOnline,
      updatedBy: driverId,
    });

    await this._audit(
      driverId,
      'DRIVER_AVAILABILITY_CHANGED',
      { driverId, availabilityStatus },
      ipAddress,
      userAgent,
    );

    return { message: SUCCESS_MESSAGES.DRIVER_AVAILABILITY_UPDATED, driver: updated };
  }

  async updateLocation(driverId, data, ipAddress, userAgent) {
    const driver = await driverRepository.findById(driverId);
    if (!driver) throw new AppError(ERROR_MESSAGES.DRIVER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const updated = await driverRepository.update(driverId, {
      currentLatitude: data.latitude,
      currentLongitude: data.longitude,
      locationUpdatedAt: new Date(),
      updatedBy: driverId,
    });

    await this._audit(driverId, 'DRIVER_LOCATION_UPDATED', { driverId }, ipAddress, userAgent);
    return { message: SUCCESS_MESSAGES.DRIVER_LOCATION_UPDATED, driver: updated };
  }

  async getDrivers(query, user) {
    if (
      !this._hasRole(user, [
        ROLES.SUPER_ADMIN,
        ROLES.SUPPORT_ADMIN,
        ROLES.FINANCE_ADMIN,
        ROLES.BUSINESS_OWNER,
      ])
    ) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    return driverRepository.findAll(query);
  }

  async getDriverById(id, user) {
    const driver = await driverRepository.findById(id);
    if (!driver) throw new AppError(ERROR_MESSAGES.DRIVER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const isSelf = user.id === id;
    const isAdmin = this._hasRole(
      user,
      ADMIN_ROLES.concat([ROLES.FINANCE_ADMIN, ROLES.BUSINESS_OWNER]),
    );
    if (!isSelf && !isAdmin) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    return driver;
  }

  async updateStatus(id, status, reason, userId, ipAddress, userAgent, user) {
    if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const driver = await driverRepository.findById(id);
    if (!driver) throw new AppError(ERROR_MESSAGES.DRIVER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const updateData = {
      status,
      updatedBy: userId,
      rejectionReason: null,
    };

    let message = SUCCESS_MESSAGES.DRIVER_STATUS_UPDATED;
    let action = 'DRIVER_STATUS_UPDATED';

    if (status === DRIVER_STATUS.ACTIVE) {
      updateData.approvedAt = new Date();
      updateData.approvedBy = userId;
      message = SUCCESS_MESSAGES.DRIVER_APPROVED;
      action = 'DRIVER_APPROVED';
    } else if (status === DRIVER_STATUS.REJECTED) {
      updateData.rejectionReason = reason || null;
      updateData.availabilityStatus = DRIVER_AVAILABILITY_STATUS.OFFLINE;
      updateData.isOnline = false;
      message = SUCCESS_MESSAGES.DRIVER_REJECTED;
      action = 'DRIVER_REJECTED';
    } else if (status === DRIVER_STATUS.SUSPENDED) {
      updateData.availabilityStatus = DRIVER_AVAILABILITY_STATUS.OFFLINE;
      updateData.isOnline = false;
      updateData.rejectionReason = reason || null;
      message = SUCCESS_MESSAGES.DRIVER_SUSPENDED;
      action = 'DRIVER_SUSPENDED';
    } else if (status === DRIVER_STATUS.INACTIVE) {
      updateData.availabilityStatus = DRIVER_AVAILABILITY_STATUS.OFFLINE;
      updateData.isOnline = false;
    }

    const updated = await driverRepository.update(id, updateData);
    await this._audit(userId, action, { driverId: id, status, reason }, ipAddress, userAgent);

    return { message, driver: updated };
  }

  async deleteDriver(id, userId, ipAddress, userAgent, user) {
    if (!this._hasRole(user, [ROLES.SUPER_ADMIN])) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const driver = await driverRepository.findById(id);
    if (!driver) throw new AppError(ERROR_MESSAGES.DRIVER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    await driverRepository.softDelete(id, userId);
    await this._audit(userId, 'DRIVER_DELETED', { driverId: id }, ipAddress, userAgent);

    return { message: SUCCESS_MESSAGES.DRIVER_DELETED };
  }

  async getDashboard(user) {
    if (!this._hasRole(user, ADMIN_ROLES.concat([ROLES.FINANCE_ADMIN, ROLES.BUSINESS_OWNER]))) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    return driverRepository.getDashboardStats();
  }

  async getDriverDashboard(driverId) {
    const driver = await driverRepository.findById(driverId);
    if (!driver) throw new AppError(ERROR_MESSAGES.DRIVER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    return {
      driverId: driver.driverId,
      status: driver.status,
      availabilityStatus: driver.availabilityStatus,
      isOnline: driver.isOnline,
      rating: driver.rating,
      totalDeliveries: driver.totalDeliveries,
      completedDeliveries: driver.completedDeliveries,
      cancelledDeliveries: driver.cancelledDeliveries,
      currentLocation:
        driver.currentLatitude != null
          ? {
              latitude: Number(driver.currentLatitude),
              longitude: Number(driver.currentLongitude),
              updatedAt: driver.locationUpdatedAt,
            }
          : null,
    };
  }

  async getHistory(driverId) {
    const history = await driverRepository.getDriverHistory(driverId);
    if (!history) throw new AppError(ERROR_MESSAGES.DRIVER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    return history;
  }
}

module.exports = new DriverService();
