const offerRepository = require('../repositories/offer.repository');
const businessRepository = require('../../business/repositories/business.repository');
const branchRepository = require('../../branch/repositories/branch.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const { removePublicUpload } = require('../../../middlewares/upload.middleware');
const AppError = require('../../../utils/AppError');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
  OFFER_STATUS,
  PERMISSION_MODULES,
} = require('../../../constants');

class OfferService {
  async _assertBusinessAccess(businessId, user) {
    const business = await businessRepository.findById(businessId);
    if (!business) throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    if (user.roles.includes(ROLES.BUSINESS_OWNER) && business.ownerId !== user.id) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
    return business;
  }

  async createOffer(data, userId, ipAddress, userAgent, user) {
    await this._assertBusinessAccess(data.businessId, user);

    if (data.branchId) {
      const branch = await branchRepository.findById(data.branchId);
      if (!branch || branch.businessId !== data.businessId) {
        throw new AppError(ERROR_MESSAGES.BRANCH_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
      }
    }

    if (Number(data.offPrice) > Number(data.actualPrice)) {
      throw new AppError('offPrice cannot be greater than actualPrice.', HTTP_STATUS.BAD_REQUEST);
    }

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (endDate < startDate) {
      throw new AppError('endDate must be after startDate.', HTTP_STATUS.BAD_REQUEST);
    }

    const offer = await offerRepository.create({
      name: data.name.trim(),
      description: data.description,
      actualPrice: data.actualPrice,
      offPrice: data.offPrice,
      startDate,
      endDate,
      photo: data.photo || null,
      businessId: data.businessId,
      branchId: data.branchId || null,
      status: data.status || OFFER_STATUS.ACTIVE,
      createdBy: userId,
    });

    await auditLogService.create({
      userId,
      action: 'OFFER_CREATED',
      module: PERMISSION_MODULES.OFFERS,
      ipAddress,
      userAgent,
      payload: { offerId: offer.id },
    });

    return { message: SUCCESS_MESSAGES.OFFER_CREATED, offer };
  }

  async getOffers(query) {
    return offerRepository.findAll(query);
  }

  async getOfferById(id) {
    const offer = await offerRepository.findById(id);
    if (!offer) throw new AppError(ERROR_MESSAGES.OFFER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    return { offer };
  }

  async updateOffer(id, data, userId, ipAddress, userAgent, user) {
    const offer = await offerRepository.findById(id);
    if (!offer) throw new AppError(ERROR_MESSAGES.OFFER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    await this._assertBusinessAccess(offer.businessId, user);

    const actualPrice = data.actualPrice != null ? Number(data.actualPrice) : Number(offer.actualPrice);
    const offPrice = data.offPrice != null ? Number(data.offPrice) : Number(offer.offPrice);
    if (offPrice > actualPrice) {
      throw new AppError('offPrice cannot be greater than actualPrice.', HTTP_STATUS.BAD_REQUEST);
    }

    const updated = await offerRepository.update(id, {
      ...data,
      ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
      ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
      updatedBy: userId,
    });

    await auditLogService.create({
      userId,
      action: 'OFFER_UPDATED',
      module: PERMISSION_MODULES.OFFERS,
      ipAddress,
      userAgent,
      payload: { offerId: id },
    });

    return { message: SUCCESS_MESSAGES.OFFER_UPDATED, offer: updated };
  }

  async deleteOffer(id, userId, ipAddress, userAgent, user) {
    const offer = await offerRepository.findById(id);
    if (!offer) throw new AppError(ERROR_MESSAGES.OFFER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    await this._assertBusinessAccess(offer.businessId, user);

    await offerRepository.softDelete(id, userId);
    await removePublicUpload(offer.photo);

    await auditLogService.create({
      userId,
      action: 'OFFER_DELETED',
      module: PERMISSION_MODULES.OFFERS,
      ipAddress,
      userAgent,
      payload: { offerId: id },
    });

    return { message: SUCCESS_MESSAGES.OFFER_DELETED };
  }

  async uploadPhoto(id, photoUrl, userId, ipAddress, userAgent, user) {
    const offer = await offerRepository.findById(id);
    if (!offer) throw new AppError(ERROR_MESSAGES.OFFER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    await this._assertBusinessAccess(offer.businessId, user);

    const old = offer.photo;
    const updated = await offerRepository.update(id, { photo: photoUrl, updatedBy: userId });
    await removePublicUpload(old);

    await auditLogService.create({
      userId,
      action: 'OFFER_PHOTO_UPLOADED',
      module: PERMISSION_MODULES.OFFERS,
      ipAddress,
      userAgent,
      payload: { offerId: id },
    });

    return { message: SUCCESS_MESSAGES.OFFER_UPDATED, offer: updated };
  }
}

module.exports = new OfferService();
