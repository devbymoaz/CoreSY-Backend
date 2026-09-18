const slotRepository = require('../repositories/slot.repository');
const businessRepository = require('../../business/repositories/business.repository');
const branchRepository = require('../../branch/repositories/branch.repository');
const serviceRepository = require('../../service/repositories/service.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const AppError = require('../../../utils/AppError');
const { splitTimeRange, shouldSplitRange } = require('../../../utils/slot-time');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
  RESERVATION_TYPE,
  BOOKING_TYPE,
  ASSOCIATED_APP,
  SLOT_STATUS,
} = require('../../../constants');

class SlotService {
  /**
   * Care/Pass reservation slots require business.reservationType = WITH_RESERVATION.
   */
  _assertBusinessAllowsReservations(business, bookingType) {
    if (bookingType !== BOOKING_TYPE.RESERVATION && bookingType !== BOOKING_TYPE.APPOINTMENT) {
      return;
    }

    if (business.reservationType !== RESERVATION_TYPE.WITH_RESERVATION) {
      throw new AppError(ERROR_MESSAGES.BUSINESS_RESERVATIONS_DISABLED, HTTP_STATUS.BAD_REQUEST);
    }

    const apps = business.associatedApps || [];
    const supportsCareOrPass =
      apps.includes(ASSOCIATED_APP.CARE) || apps.includes(ASSOCIATED_APP.PASS);
    if (apps.length > 0 && !supportsCareOrPass) {
      throw new AppError(
        'Reservation slots are for Care/Pass businesses. Include CARE or PASS in associatedApps.',
        HTTP_STATUS.BAD_REQUEST,
      );
    }
  }

  _mapAvailability(slot) {
    const activeBookings = slot.bookings || [];
    const bookedGuests = activeBookings.reduce((sum, b) => sum + (b.numberOfGuests || 0), 0);
    const isFull =
      slot.status === SLOT_STATUS.FULL ||
      slot.remainingCapacity <= 0 ||
      bookedGuests >= slot.maxCapacity;
    const isClosed =
      slot.status === SLOT_STATUS.CLOSED ||
      slot.status === SLOT_STATUS.CANCELLED ||
      slot.status === SLOT_STATUS.INACTIVE;
    const isAvailable = !isFull && !isClosed && slot.status === SLOT_STATUS.AVAILABLE;

    let reason = null;
    if (isClosed) reason = slot.status;
    else if (isFull) reason = 'FULL';

    return {
      id: slot.id,
      serviceId: slot.serviceId,
      businessId: slot.businessId,
      branchId: slot.branchId,
      slotDate: slot.slotDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      duration: slot.duration,
      maxCapacity: slot.maxCapacity,
      remainingCapacity: slot.remainingCapacity,
      status: slot.status,
      bookingType: slot.bookingType,
      isAvailable,
      isUnavailable: !isAvailable,
      reason,
      activeBookingsCount: activeBookings.length,
      bookedGuests,
      bookings: activeBookings,
      service: slot.service,
      branch: slot.branch,
      business: slot.business,
    };
  }

  async _createIntervalSlots({
    data,
    intervals,
    slotDate,
    dayOfWeek,
    userId,
  }) {
    const created = [];
    const skipped = [];

    for (const interval of intervals) {
      const overlappingSlots = await slotRepository.checkForOverlap(
        data.branchId,
        slotDate,
        interval.startTime,
        interval.endTime,
      );
      if (overlappingSlots.length > 0) {
        skipped.push({
          startTime: interval.startTime,
          endTime: interval.endTime,
          reason: 'OVERLAP',
        });
        continue;
      }

      const slot = await slotRepository.create({
        serviceId: data.serviceId,
        businessId: data.businessId,
        branchId: data.branchId,
        slotDate,
        dayOfWeek,
        startTime: interval.startTime,
        endTime: interval.endTime,
        duration: interval.duration,
        maxCapacity: data.maxCapacity,
        remainingCapacity: data.maxCapacity,
        bookingType: data.bookingType,
        genderRestriction: data.genderRestriction,
        minAge: data.minAge,
        maxAge: data.maxAge,
        isRecurring: data.isRecurring || false,
        recurringType: data.recurringType || 'NONE',
        recurringEndDate: data.recurringEndDate ? new Date(data.recurringEndDate) : null,
        createdBy: userId,
      });
      created.push(slot);
    }

    return { created, skipped };
  }

  async createSlot(data, userId, ipAddress, userAgent, user) {
    const business = await businessRepository.findById(data.businessId);
    if (!business) throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const branch = await branchRepository.findById(data.branchId);
    if (!branch) throw new AppError(ERROR_MESSAGES.BRANCH_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const service = await serviceRepository.findById(data.serviceId);
    if (!service) throw new AppError(ERROR_MESSAGES.SERVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (user.roles.includes(ROLES.BUSINESS_OWNER) && business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    this._assertBusinessAllowsReservations(business, data.bookingType);

    const slotDate = new Date(data.slotDate);
    const dayOfWeek = slotDate.getDay();
    const doSplit = shouldSplitRange(
      data.startTime,
      data.endTime,
      data.duration,
      data.splitIntoIntervals,
    );

    let intervals;
    try {
      intervals = doSplit
        ? splitTimeRange(data.startTime, data.endTime, data.duration)
        : [
            {
              startTime: data.startTime,
              endTime: data.endTime,
              duration: data.duration,
            },
          ];
    } catch (error) {
      throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
    }

    if (intervals.length === 0) {
      throw new AppError(
        'No intervals generated. Check startTime, endTime, and duration (e.g. 10:00-21:00 with duration 60).',
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const { created, skipped } = await this._createIntervalSlots({
      data,
      intervals,
      slotDate,
      dayOfWeek,
      userId,
    });

    if (created.length === 0) {
      throw new AppError(ERROR_MESSAGES.SLOT_OVERLAP, HTTP_STATUS.CONFLICT);
    }

    await auditLogService.create({
      userId,
      action: 'SLOT_CREATED',
      module: 'Slots',
      ipAddress,
      userAgent,
      payload: { count: created.length, skipped: skipped.length },
    });

    return {
      message: SUCCESS_MESSAGES.SLOT_CREATED,
      count: created.length,
      skippedCount: skipped.length,
      skipped,
      slot: created[0],
      slots: created,
    };
  }

  /**
   * Explicit hourly/interval generator for Flutter (same as create with split).
   * Body: startTime/endTime window + duration (default 60).
   */
  async generateHourlySlots(data, userId, ipAddress, userAgent, user) {
    return this.createSlot(
      {
        ...data,
        duration: data.duration || 60,
        splitIntoIntervals: true,
      },
      userId,
      ipAddress,
      userAgent,
      user,
    );
  }

  async createRecurringSlots(data, userId, ipAddress, userAgent, user) {
    const business = await businessRepository.findById(data.businessId);
    if (!business) throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const branch = await branchRepository.findById(data.branchId);
    if (!branch) throw new AppError(ERROR_MESSAGES.BRANCH_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const service = await serviceRepository.findById(data.serviceId);
    if (!service) throw new AppError(ERROR_MESSAGES.SERVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (user.roles.includes(ROLES.BUSINESS_OWNER) && business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    this._assertBusinessAllowsReservations(business, data.bookingType);

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const doSplit = shouldSplitRange(
      data.startTime,
      data.endTime,
      data.duration,
      data.splitIntoIntervals,
    );

    let intervals;
    try {
      intervals = doSplit
        ? splitTimeRange(data.startTime, data.endTime, data.duration)
        : [
            {
              startTime: data.startTime,
              endTime: data.endTime,
              duration: data.duration,
            },
          ];
    } catch (error) {
      throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
    }

    if (intervals.length === 0) {
      throw new AppError(
        'No intervals generated. Check startTime, endTime, and duration.',
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const slots = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (!data.daysOfWeek.includes(d.getDay())) continue;
      const slotDate = new Date(d);

      for (const interval of intervals) {
        const overlappingSlots = await slotRepository.checkForOverlap(
          data.branchId,
          slotDate,
          interval.startTime,
          interval.endTime,
        );
        if (overlappingSlots.length > 0) continue;

        slots.push({
          serviceId: data.serviceId,
          businessId: data.businessId,
          branchId: data.branchId,
          slotDate: new Date(slotDate),
          dayOfWeek: slotDate.getDay(),
          startTime: interval.startTime,
          endTime: interval.endTime,
          duration: interval.duration,
          maxCapacity: data.maxCapacity,
          remainingCapacity: data.maxCapacity,
          bookingType: data.bookingType,
          genderRestriction: data.genderRestriction,
          minAge: data.minAge,
          maxAge: data.maxAge,
          isRecurring: true,
          recurringType: 'DAILY',
          recurringEndDate: endDate,
          createdBy: userId,
        });
      }
    }

    if (slots.length > 0) await slotRepository.createMany(slots);

    await auditLogService.create({
      userId,
      action: 'SLOT_RECURRING_CREATED',
      module: 'Slots',
      ipAddress,
      userAgent,
      payload: { count: slots.length },
    });

    return { message: SUCCESS_MESSAGES.SLOT_RECURRING_CREATED, count: slots.length };
  }

  async duplicateSlot(id, newDate, userId, ipAddress, userAgent, user) {
    const originalSlot = await slotRepository.findById(id);
    if (!originalSlot) throw new AppError(ERROR_MESSAGES.SLOT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (user.roles.includes(ROLES.BUSINESS_OWNER) && originalSlot.business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const slotDate = new Date(newDate);
    const overlappingSlots = await slotRepository.checkForOverlap(
      originalSlot.branchId,
      slotDate,
      originalSlot.startTime,
      originalSlot.endTime,
    );
    if (overlappingSlots.length > 0) {
      throw new AppError(ERROR_MESSAGES.SLOT_OVERLAP, HTTP_STATUS.CONFLICT);
    }

    const newSlotData = {
      serviceId: originalSlot.serviceId,
      businessId: originalSlot.businessId,
      branchId: originalSlot.branchId,
      slotDate,
      dayOfWeek: slotDate.getDay(),
      startTime: originalSlot.startTime,
      endTime: originalSlot.endTime,
      duration: originalSlot.duration,
      maxCapacity: originalSlot.maxCapacity,
      remainingCapacity: originalSlot.maxCapacity,
      bookingType: originalSlot.bookingType,
      genderRestriction: originalSlot.genderRestriction,
      minAge: originalSlot.minAge,
      maxAge: originalSlot.maxAge,
      createdBy: userId,
    };

    const newSlot = await slotRepository.create(newSlotData);

    await auditLogService.create({
      userId,
      action: 'SLOT_DUPLICATED',
      module: 'Slots',
      ipAddress,
      userAgent,
      payload: { originalSlotId: id, newSlotId: newSlot.id },
    });

    return { message: SUCCESS_MESSAGES.SLOT_DUPLICATED, slot: newSlot };
  }

  async getSlots(query, user) {
    return slotRepository.findAll(query);
  }

  async getSlotById(id, user) {
    const slot = await slotRepository.findById(id);
    if (!slot) throw new AppError(ERROR_MESSAGES.SLOT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (user.roles.includes(ROLES.BUSINESS_OWNER) && slot.business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    return slot;
  }

  async getServiceSlots(serviceId, user, options = {}) {
    const service = await serviceRepository.findById(serviceId);
    if (!service) throw new AppError(ERROR_MESSAGES.SERVICE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    return slotRepository.findByServiceId(serviceId, options);
  }

  async getBranchSlots(branchId, user, options = {}) {
    const branch = await branchRepository.findById(branchId);
    if (!branch) throw new AppError(ERROR_MESSAGES.BRANCH_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    return slotRepository.findByBranchId(branchId, options);
  }

  async updateSlot(id, data, userId, ipAddress, userAgent, user) {
    const slot = await slotRepository.findById(id);
    if (!slot) throw new AppError(ERROR_MESSAGES.SLOT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (user.roles.includes(ROLES.BUSINESS_OWNER) && slot.business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    if (data.slotDate || data.startTime || data.endTime) {
      const slotDate = data.slotDate ? new Date(data.slotDate) : slot.slotDate;
      const startTime = data.startTime || slot.startTime;
      const endTime = data.endTime || slot.endTime;
      const overlappingSlots = await slotRepository.checkForOverlap(
        slot.branchId,
        slotDate,
        startTime,
        endTime,
        id,
      );
      if (overlappingSlots.length > 0) {
        throw new AppError(ERROR_MESSAGES.SLOT_OVERLAP, HTTP_STATUS.CONFLICT);
      }
    }

    const updateData = { ...data, updatedBy: userId };
    if (data.slotDate) updateData.dayOfWeek = new Date(data.slotDate).getDay();
    if (data.recurringEndDate) updateData.recurringEndDate = new Date(data.recurringEndDate);
    if (data.maxCapacity !== undefined)
      updateData.remainingCapacity = data.maxCapacity - (slot.maxCapacity - slot.remainingCapacity);

    const updatedSlot = await slotRepository.update(id, updateData);

    await auditLogService.create({
      userId,
      action: 'SLOT_UPDATED',
      module: 'Slots',
      ipAddress,
      userAgent,
      payload: { slotId: id },
    });

    return { message: SUCCESS_MESSAGES.SLOT_UPDATED, slot: updatedSlot };
  }

  async deleteSlot(id, userId, ipAddress, userAgent, user) {
    const slot = await slotRepository.findById(id);
    if (!slot) throw new AppError(ERROR_MESSAGES.SLOT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (user.roles.includes(ROLES.BUSINESS_OWNER) && slot.business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    await slotRepository.softDelete(id, userId);

    await auditLogService.create({
      userId,
      action: 'SLOT_DELETED',
      module: 'Slots',
      ipAddress,
      userAgent,
      payload: { slotId: id },
    });

    return { message: SUCCESS_MESSAGES.SLOT_DELETED };
  }

  async updateSlotStatus(id, status, userId, ipAddress, userAgent) {
    const slot = await slotRepository.findById(id);
    if (!slot) throw new AppError(ERROR_MESSAGES.SLOT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const updatedSlot = await slotRepository.update(id, { status, updatedBy: userId });

    await auditLogService.create({
      userId,
      action: 'SLOT_STATUS_UPDATED',
      module: 'Slots',
      ipAddress,
      userAgent,
      payload: { slotId: id, status },
    });

    return { message: SUCCESS_MESSAGES.SLOT_STATUS_UPDATED, slot: updatedSlot };
  }

  async getAvailability(query) {
    if (!query.date) {
      throw new AppError('date is required (YYYY-MM-DD).', HTTP_STATUS.BAD_REQUEST);
    }
    if (!query.serviceId && !query.branchId && !query.businessId) {
      throw new AppError(
        'Provide at least one of serviceId, branchId, or businessId.',
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const slots = await slotRepository.findAvailability({
      serviceId: query.serviceId,
      branchId: query.branchId,
      businessId: query.businessId,
      date: query.date,
    });

    const mapped = slots.map((slot) => this._mapAvailability(slot));
    const available = mapped.filter((s) => s.isAvailable);
    const unavailable = mapped.filter((s) => s.isUnavailable);

    return {
      date: query.date,
      total: mapped.length,
      availableCount: available.length,
      unavailableCount: unavailable.length,
      slots: mapped,
      availableSlots: available,
      unavailableSlots: unavailable,
    };
  }

  async getUnavailableSlots(query) {
    const result = await this.getAvailability(query);
    return {
      date: result.date,
      count: result.unavailableCount,
      slots: result.unavailableSlots,
    };
  }

  async getDashboardStats(businessId = null, branchId = null, user) {
    if (businessId) {
      const business = await businessRepository.findById(businessId);
      if (!business) throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      if (user.roles.includes(ROLES.BUSINESS_OWNER) && business.ownerId !== user.id) {
        throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
      }
    }

    return slotRepository.getDashboardStats(businessId, branchId);
  }
}

module.exports = new SlotService();
