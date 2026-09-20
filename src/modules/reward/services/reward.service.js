const rewardRepository = require('../repositories/reward.repository');
const businessRepository = require('../../business/repositories/business.repository');
const pointsService = require('../../points/services/points.service');
const auditLogService = require('../../rbac/services/audit-log.service');
const { removePublicUpload } = require('../../../middlewares/upload.middleware');
const AppError = require('../../../utils/AppError');
const { prisma } = require('../../../prisma');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
  REWARD_STATUS,
  PERMISSION_MODULES,
  POINT_TRANSACTION_TYPE,
} = require('../../../constants');

class RewardService {
  async _assertBusinessAccess(businessId, user) {
    if (!businessId) {
      if (!user.roles.includes(ROLES.SUPER_ADMIN) && !user.roles.includes(ROLES.SUPPORT_ADMIN)) {
        throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
      }
      return null;
    }
    const business = await businessRepository.findById(businessId);
    if (!business) throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
    return business;
  }

  async createReward(data, userId, ipAddress, userAgent, user) {
    await this._assertBusinessAccess(data.businessId || null, user);

    const reward = await rewardRepository.create({
      name: data.name.trim(),
      description: data.description,
      pointsCost: Number(data.pointsCost),
      photo: data.photo || null,
      stock: data.stock != null ? Number(data.stock) : null,
      businessId: data.businessId || null,
      branchId: data.branchId || null,
      status: data.status || REWARD_STATUS.ACTIVE,
      createdBy: userId,
    });

    await auditLogService.create({
      userId,
      action: 'REWARD_CREATED',
      module: PERMISSION_MODULES.REWARDS,
      ipAddress,
      userAgent,
      payload: { rewardId: reward.id },
    });

    return { message: SUCCESS_MESSAGES.REWARD_CREATED, reward };
  }

  async getRewards(query) {
    return rewardRepository.findAll(query);
  }

  async getRewardById(id) {
    const reward = await rewardRepository.findById(id);
    if (!reward) throw new AppError(ERROR_MESSAGES.REWARD_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    return { reward };
  }

  async updateReward(id, data, userId, ipAddress, userAgent, user) {
    const reward = await rewardRepository.findById(id);
    if (!reward) throw new AppError(ERROR_MESSAGES.REWARD_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    await this._assertBusinessAccess(reward.businessId, user);

    const updated = await rewardRepository.update(id, {
      ...data,
      ...(data.pointsCost != null ? { pointsCost: Number(data.pointsCost) } : {}),
      ...(data.stock != null ? { stock: Number(data.stock) } : {}),
      updatedBy: userId,
    });

    await auditLogService.create({
      userId,
      action: 'REWARD_UPDATED',
      module: PERMISSION_MODULES.REWARDS,
      ipAddress,
      userAgent,
      payload: { rewardId: id },
    });

    return { message: SUCCESS_MESSAGES.REWARD_UPDATED, reward: updated };
  }

  async deleteReward(id, userId, ipAddress, userAgent, user) {
    const reward = await rewardRepository.findById(id);
    if (!reward) throw new AppError(ERROR_MESSAGES.REWARD_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    await this._assertBusinessAccess(reward.businessId, user);

    await rewardRepository.softDelete(id, userId);
    await removePublicUpload(reward.photo);

    await auditLogService.create({
      userId,
      action: 'REWARD_DELETED',
      module: PERMISSION_MODULES.REWARDS,
      ipAddress,
      userAgent,
      payload: { rewardId: id },
    });

    return { message: SUCCESS_MESSAGES.REWARD_DELETED };
  }

  async uploadPhoto(id, photoUrl, userId, ipAddress, userAgent, user) {
    const reward = await rewardRepository.findById(id);
    if (!reward) throw new AppError(ERROR_MESSAGES.REWARD_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    await this._assertBusinessAccess(reward.businessId, user);

    const old = reward.photo;
    const updated = await rewardRepository.update(id, { photo: photoUrl, updatedBy: userId });
    await removePublicUpload(old);

    return { message: SUCCESS_MESSAGES.REWARD_UPDATED, reward: updated };
  }

  async redeemReward(rewardId, user, ipAddress, userAgent) {
    const reward = await rewardRepository.findById(rewardId);
    if (!reward) throw new AppError(ERROR_MESSAGES.REWARD_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    if (reward.status !== REWARD_STATUS.ACTIVE) {
      throw new AppError(ERROR_MESSAGES.REWARD_OUT_OF_STOCK, HTTP_STATUS.BAD_REQUEST);
    }
    if (reward.stock != null && reward.stock <= 0) {
      throw new AppError(ERROR_MESSAGES.REWARD_OUT_OF_STOCK, HTTP_STATUS.CONFLICT);
    }

    const account = await pointsService.getOrCreateAccount(user.id);
    if (Number(account.availablePoints) < reward.pointsCost) {
      throw new AppError(ERROR_MESSAGES.INSUFFICIENT_POINTS, HTTP_STATUS.BAD_REQUEST);
    }

    const pointsResult = await pointsService._applyPoints({
      customerId: user.id,
      points: reward.pointsCost,
      type: POINT_TRANSACTION_TYPE.REDEEM,
      description: `Redeemed reward: ${reward.name}`,
      createdBy: user.id,
    });

    if (reward.stock != null) {
      await rewardRepository.decrementStock(reward.id);
      const refreshed = await rewardRepository.findById(reward.id);
      if (refreshed.stock != null && refreshed.stock <= 0) {
        await rewardRepository.update(reward.id, { status: REWARD_STATUS.OUT_OF_STOCK });
      }
    }

    const redemption = await rewardRepository.createRedemption({
      rewardId: reward.id,
      userId: user.id,
      pointsSpent: reward.pointsCost,
      status: 'COMPLETED',
    });

    await auditLogService.create({
      userId: user.id,
      action: 'REWARD_REDEEMED',
      module: PERMISSION_MODULES.REWARDS,
      ipAddress,
      userAgent,
      payload: { rewardId, redemptionId: redemption.id },
    });

    try {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Reward redeemed',
          message: `You redeemed ${reward.name} for ${reward.pointsCost} points.`,
          type: 'REWARD_REDEEMED',
          data: { rewardId, redemptionId: redemption.id },
        },
      });
    } catch (_e) {
      // non-blocking
    }

    return {
      message: SUCCESS_MESSAGES.REWARD_REDEEMED,
      redemption,
      reward,
      points: pointsResult,
    };
  }
}

module.exports = new RewardService();
