const slotService = require('../services/slot.service');
const { sendSuccess, sendCreated } = require('../../../helpers/response.helper');
const asyncHandler = require('../../../utils/asyncHandler');

const createSlot = asyncHandler(async (req, res) => {
  const result = await slotService.createSlot(
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendCreated(res, result);
});

const getSlots = asyncHandler(async (req, res) => {
  const result = await slotService.getSlots(req.query, req.user);
  return sendSuccess(res, result);
});

const getSlotById = asyncHandler(async (req, res) => {
  const slot = await slotService.getSlotById(req.params.id, req.user);
  return sendSuccess(res, { slot });
});

const getServiceSlots = asyncHandler(async (req, res) => {
  const result = await slotService.getServiceSlots(
    req.params.serviceId,
    req.user,
    req.query,
  );
  return sendSuccess(res, result);
});

const getBranchSlots = asyncHandler(async (req, res) => {
  const result = await slotService.getBranchSlots(
    req.params.branchId,
    req.user,
    req.query,
  );
  return sendSuccess(res, result);
});

const updateSlot = asyncHandler(async (req, res) => {
  const result = await slotService.updateSlot(
    req.params.id,
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const deleteSlot = asyncHandler(async (req, res) => {
  const result = await slotService.deleteSlot(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const updateSlotStatus = asyncHandler(async (req, res) => {
  const result = await slotService.updateSlotStatus(
    req.params.id,
    req.body.status,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
  );
  return sendSuccess(res, result);
});

const createRecurringSlots = asyncHandler(async (req, res) => {
  const result = await slotService.createRecurringSlots(
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendCreated(res, result);
});

const duplicateSlot = asyncHandler(async (req, res) => {
  const result = await slotService.duplicateSlot(
    req.params.id,
    req.body.newDate,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendCreated(res, result);
});

const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await slotService.getDashboardStats(
    req.query.businessId,
    req.query.branchId,
    req.user,
  );
  return sendSuccess(res, { stats });
});

module.exports = {
  createSlot,
  getSlots,
  getSlotById,
  getServiceSlots,
  getBranchSlots,
  updateSlot,
  deleteSlot,
  updateSlotStatus,
  createRecurringSlots,
  duplicateSlot,
  getDashboardStats,
};
