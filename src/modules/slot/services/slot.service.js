const slotRepository = require('../repositories/slot.repository');
const businessRepository = require('../../business/repositories/business.repository');
const branchRepository = require('../../branch/repositories/branch.repository');
const serviceRepository = require('../../service/repositories/service.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const AppError = require('../../../utils/AppError');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
} = require('../../../constants');

class SlotService {
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

    const slotDate = new Date(data.slotDate);
    const overlappingSlots = await slotRepository.checkForOverlap(data.branchId, slotDate, data.startTime, data.endTime);
    if (overlappingSlots.length > 0) {
      throw new AppError(ERROR_MESSAGES.SLOT_OVERLAP, HTTP_STATUS.CONFLICT);
    }

    const dayOfWeek = slotDate.getDay();
    const slotData = {
      serviceId: data.serviceId,
      businessId: data.businessId,
      branchId: data.branchId,
      slotDate,
      dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      duration: data.duration,
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
    };

    const slot = await slotRepository.create(slotData);

    await auditLogService.create({
      userId,
      action: 'SLOT_CREATED',
      module: 'Slots',
      ipAddress,
      userAgent,
      payload: { slotId: slot.id },
    });

    return { message: SUCCESS_MESSAGES.SLOT_CREATED, slot };
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

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const slots = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (data.daysOfWeek.includes(d.getDay())) {
        const overlappingSlots = await slotRepository.checkForOverlap(data.branchId, new Date(d), data.startTime, data.endTime);
        if (overlappingSlots.length === 0) {
          slots.push({
            serviceId: data.serviceId,
            businessId: data.businessId,
            branchId: data.branchId,
            slotDate: new Date(d),
            dayOfWeek: d.getDay(),
            startTime: data.startTime,
            endTime: data.endTime,
            duration: data.duration,
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
    const overlappingSlots = await slotRepository.checkForOverlap(originalSlot.branchId, slotDate, originalSlot.startTime, originalSlot.endTime);
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
      const overlappingSlots = await slotRepository.checkForOverlap(slot.branchId, slotDate, startTime, endTime, id);
      if (overlappingSlots.length > 0) {
        throw new AppError(ERROR_MESSAGES.SLOT_OVERLAP, HTTP_STATUS.CONFLICT);
      }
    }

    const updateData = { ...data, updatedBy: userId };
    if (data.slotDate) updateData.dayOfWeek = new Date(data.slotDate).getDay();
    if (data.recurringEndDate) updateData.recurringEndDate = new Date(data.recurringEndDate);
    if (data.maxCapacity !== undefined) updateData.remainingCapacity = data.maxCapacity - (slot.maxCapacity - slot.remainingCapacity);

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
