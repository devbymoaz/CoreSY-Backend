/**
 * Wallet service.
 * Customer wallet balance and ledger operations.
 */

const walletRepository = require('../repositories/wallet.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const AppError = require('../../../utils/AppError');
const logger = require('../../../utils/logger');
const { prisma } = require('../../../prisma');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
  WALLET_STATUS,
  WALLET_TRANSACTION_TYPE,
  WALLET_TRANSACTION_STATUS,
  PERMISSION_MODULES,
} = require('../../../constants');

const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN];

class WalletService {
  _hasRole(user, roles) {
    return roles.some((role) => user.roles?.includes(role));
  }

  async _audit(userId, action, payload, ipAddress, userAgent) {
    const entry = {
      userId,
      action,
      module: PERMISSION_MODULES.WALLET,
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
    try {
      await prisma.notification.create({
        data: { userId, title, message, type, data },
      });
    } catch (error) {
      logger.error('Failed to create wallet notification:', error);
    }
  }

  async _generateWalletId() {
    const count = await prisma.wallet.count();
    return `WLT-${String(count + 1).padStart(8, '0')}`;
  }

  async _generateTxnIds() {
    const stamp = Date.now();
    const rand = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return {
      transactionId: `WTX-${stamp}${rand}`,
      referenceNumber: `WREF-${stamp}${rand}`,
    };
  }

  async getOrCreateWallet(customerId) {
    let wallet = await walletRepository.findByCustomerId(customerId);
    if (wallet) return wallet;

    const customer = await prisma.user.findFirst({
      where: { id: customerId, deletedAt: null },
    });
    if (!customer) throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const walletId = await this._generateWalletId();
    wallet = await walletRepository.create({
      walletId,
      customerId,
      currentBalance: 0,
      availableBalance: 0,
      blockedBalance: 0,
      currency: 'SYP',
      status: WALLET_STATUS.ACTIVE,
    });

    await this._audit(customerId, 'WALLET_CREATED', { walletId: wallet.id }, null, null);
    return wallet;
  }

  async _applyBalanceChange({
    customerId,
    amount,
    type,
    description,
    bookingId = null,
    orderId = null,
    paymentId = null,
    createdBy = null,
    allowNegative = false,
  }) {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      throw new AppError(ERROR_MESSAGES.WALLET_INVALID_AMOUNT, HTTP_STATUS.BAD_REQUEST);
    }

    return prisma.$transaction(async (tx) => {
      let wallet = await tx.wallet.findFirst({
        where: { customerId, deletedAt: null },
      });

      if (!wallet) {
        const walletId = `WLT-${Date.now()}`;
        wallet = await tx.wallet.create({
          data: {
            walletId,
            customerId,
            currentBalance: 0,
            availableBalance: 0,
            blockedBalance: 0,
            currency: 'SYP',
            status: WALLET_STATUS.ACTIVE,
          },
        });
      }

      if (
        wallet.status !== WALLET_STATUS.ACTIVE &&
        type !== WALLET_TRANSACTION_TYPE.ADMIN_ADJUSTMENT
      ) {
        throw new AppError(ERROR_MESSAGES.WALLET_NOT_ACTIVE, HTTP_STATUS.FORBIDDEN);
      }

      const balanceBefore = Number(wallet.availableBalance);
      const isCredit = [
        WALLET_TRANSACTION_TYPE.CREDIT,
        WALLET_TRANSACTION_TYPE.REFUND,
        WALLET_TRANSACTION_TYPE.TOP_UP,
        WALLET_TRANSACTION_TYPE.CASHBACK,
        WALLET_TRANSACTION_TYPE.REWARD_CREDIT,
        WALLET_TRANSACTION_TYPE.PLATFORM_REFUND,
      ].includes(type);

      const isAdminAdjustment = type === WALLET_TRANSACTION_TYPE.ADMIN_ADJUSTMENT;
      let balanceAfter = balanceBefore;

      if (
        isCredit ||
        (isAdminAdjustment &&
          allowNegative === false &&
          numericAmount > 0 &&
          description?.includes('credit'))
      ) {
        // handled below
      }

      if (
        type === WALLET_TRANSACTION_TYPE.DEBIT ||
        type === WALLET_TRANSACTION_TYPE.REWARD_REDEMPTION ||
        (type === WALLET_TRANSACTION_TYPE.ADMIN_ADJUSTMENT && description?.startsWith('DEBIT:'))
      ) {
        if (balanceBefore < numericAmount && !allowNegative) {
          throw new AppError(ERROR_MESSAGES.WALLET_INSUFFICIENT_BALANCE, HTTP_STATUS.BAD_REQUEST);
        }
        balanceAfter = Number((balanceBefore - numericAmount).toFixed(2));
      } else if (
        type === WALLET_TRANSACTION_TYPE.ADMIN_ADJUSTMENT &&
        description?.startsWith('CREDIT:')
      ) {
        balanceAfter = Number((balanceBefore + numericAmount).toFixed(2));
      } else {
        balanceAfter = Number((balanceBefore + numericAmount).toFixed(2));
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: balanceAfter,
          currentBalance: balanceAfter + Number(wallet.blockedBalance),
          updatedBy: createdBy,
        },
        include: {
          customer: {
            select: { id: true, fullName: true, email: true, phoneNumber: true },
          },
        },
      });

      const ids = await this._generateTxnIds();
      const transaction = await tx.walletTransaction.create({
        data: {
          transactionId: ids.transactionId,
          walletId: wallet.id,
          referenceNumber: ids.referenceNumber,
          bookingId,
          orderId,
          paymentId,
          type,
          amount: numericAmount,
          balanceBefore,
          balanceAfter,
          description,
          status: WALLET_TRANSACTION_STATUS.COMPLETED,
          createdBy,
        },
      });

      return { wallet: updatedWallet, transaction };
    });
  }

  async creditWallet(params) {
    return this._applyBalanceChange({
      ...params,
      type: params.type || WALLET_TRANSACTION_TYPE.CREDIT,
    });
  }

  async debitWallet(params) {
    return this._applyBalanceChange({
      ...params,
      type: params.type || WALLET_TRANSACTION_TYPE.DEBIT,
    });
  }

  async getWallet(user) {
    const wallet = await this.getOrCreateWallet(user.id);
    return { wallet };
  }

  async getBalance(user) {
    const wallet = await this.getOrCreateWallet(user.id);
    return {
      walletId: wallet.walletId,
      currentBalance: Number(wallet.currentBalance),
      availableBalance: Number(wallet.availableBalance),
      blockedBalance: Number(wallet.blockedBalance),
      currency: wallet.currency,
      status: wallet.status,
    };
  }

  async getHistory(query, user) {
    const wallet = await this.getOrCreateWallet(user.id);
    return walletRepository.findTransactions({ ...query, walletId: wallet.id });
  }

  async getTransactions(query, user) {
    return this.getHistory(query, user);
  }

  async topUp(data, user, ipAddress, userAgent) {
    const amount = Number(data.amount);
    const result = await this.creditWallet({
      customerId: user.id,
      amount,
      type: WALLET_TRANSACTION_TYPE.TOP_UP,
      description: data.description || 'Wallet top-up',
      createdBy: user.id,
    });

    await this._audit(user.id, 'WALLET_TOP_UP', { amount }, ipAddress, userAgent);
    await this._notify(
      user.id,
      'Wallet Credited',
      `Your wallet was credited with ${amount} ${result.wallet.currency}.`,
      'WALLET_CREDITED',
      { amount },
    );

    return { message: SUCCESS_MESSAGES.WALLET_TOPPED_UP, ...result };
  }

  async withdraw(data, user, ipAddress, userAgent) {
    const amount = Number(data.amount);
    const result = await this.debitWallet({
      customerId: user.id,
      amount,
      type: WALLET_TRANSACTION_TYPE.DEBIT,
      description: data.description || 'Wallet withdrawal',
      createdBy: user.id,
    });

    await this._audit(user.id, 'WALLET_WITHDRAW', { amount }, ipAddress, userAgent);
    await this._notify(
      user.id,
      'Wallet Debited',
      `Your wallet was debited by ${amount} ${result.wallet.currency}.`,
      'WALLET_DEBITED',
      { amount },
    );

    return { message: SUCCESS_MESSAGES.WALLET_WITHDRAWN, ...result };
  }

  async transfer(data, user, ipAddress, userAgent) {
    if (data.toCustomerId === user.id) {
      throw new AppError(ERROR_MESSAGES.WALLET_TRANSFER_SAME, HTTP_STATUS.BAD_REQUEST);
    }

    const amount = Number(data.amount);
    const recipient = await prisma.user.findFirst({
      where: { id: data.toCustomerId, deletedAt: null },
    });
    if (!recipient) throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const debitResult = await this.debitWallet({
      customerId: user.id,
      amount,
      type: WALLET_TRANSACTION_TYPE.DEBIT,
      description: `Transfer to ${recipient.fullName}`,
      createdBy: user.id,
    });

    const creditResult = await this.creditWallet({
      customerId: data.toCustomerId,
      amount,
      type: WALLET_TRANSACTION_TYPE.CREDIT,
      description: `Transfer from ${user.fullName || user.email}`,
      createdBy: user.id,
    });

    await this._audit(
      user.id,
      'WALLET_TRANSFER',
      { amount, toCustomerId: data.toCustomerId },
      ipAddress,
      userAgent,
    );

    return {
      message: SUCCESS_MESSAGES.WALLET_TRANSFERRED,
      fromWallet: debitResult.wallet,
      toWallet: creditResult.wallet,
      amount,
    };
  }

  async getCustomerDashboard(user) {
    const wallet = await this.getOrCreateWallet(user.id);
    return walletRepository.getCustomerDashboard(wallet.id);
  }

  // Admin APIs
  async getWallets(query, user) {
    if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
    return walletRepository.findAll(query);
  }

  async getWalletById(id, user) {
    if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
    const wallet = await walletRepository.findById(id);
    if (!wallet) throw new AppError(ERROR_MESSAGES.WALLET_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    return wallet;
  }

  async freezeWallet(id, userId, ipAddress, userAgent, user) {
    if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
    const wallet = await walletRepository.findById(id);
    if (!wallet) throw new AppError(ERROR_MESSAGES.WALLET_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const updated = await walletRepository.update(id, {
      status: WALLET_STATUS.SUSPENDED,
      updatedBy: userId,
    });

    await this._audit(userId, 'WALLET_FROZEN', { walletId: id }, ipAddress, userAgent);
    return { message: SUCCESS_MESSAGES.WALLET_FROZEN, wallet: updated };
  }

  async unfreezeWallet(id, userId, ipAddress, userAgent, user) {
    if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
    const wallet = await walletRepository.findById(id);
    if (!wallet) throw new AppError(ERROR_MESSAGES.WALLET_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const updated = await walletRepository.update(id, {
      status: WALLET_STATUS.ACTIVE,
      updatedBy: userId,
    });

    await this._audit(userId, 'WALLET_UNFROZEN', { walletId: id }, ipAddress, userAgent);
    return { message: SUCCESS_MESSAGES.WALLET_UNFROZEN, wallet: updated };
  }

  async adjustWallet(data, userId, ipAddress, userAgent, user) {
    if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    const wallet = await walletRepository.findById(data.walletId);
    if (!wallet) throw new AppError(ERROR_MESSAGES.WALLET_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const amount = Number(data.amount);
    const direction = data.direction === 'DEBIT' ? 'DEBIT' : 'CREDIT';
    const result = await this._applyBalanceChange({
      customerId: wallet.customerId,
      amount,
      type: WALLET_TRANSACTION_TYPE.ADMIN_ADJUSTMENT,
      description: `${direction}: ${data.reason || 'Admin adjustment'}`,
      createdBy: userId,
      allowNegative: direction === 'DEBIT',
    });

    await this._audit(
      userId,
      'WALLET_ADJUSTMENT',
      { walletId: wallet.id, amount, direction },
      ipAddress,
      userAgent,
    );

    return { message: SUCCESS_MESSAGES.WALLET_ADJUSTED, ...result };
  }

  async getAdminDashboard(user) {
    if (!this._hasRole(user, ADMIN_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
    return walletRepository.getAdminDashboard();
  }
}

module.exports = new WalletService();
