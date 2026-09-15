/**
 * Authentication service.
 * Contains all authentication business logic - registration, login, tokens, and profile management.
 */

const userRepository = require('../repositories/user.repository');
const pendingRegistrationRepository = require('../repositories/pending-registration.repository');
const { removePublicUpload } = require('../middlewares/upload.middleware');
const governorateRepository = require('../repositories/governorate.repository');
const roleRepository = require('../repositories/role.repository');
const refreshTokenRepository = require('../repositories/refreshToken.repository');
const businessRepository = require('../modules/business/repositories/business.repository');
const redisService = require('./redis.service');
const emailService = require('./email.service');
const { OTP_PURPOSES } = emailService;
const { hashPassword, comparePassword } = require('../utils/password');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { generateOtp } = require('../utils/otp');
const { hashToken, generateJti } = require('../utils/tokenHash');
const { toUserResponse, toAuthResponse } = require('../models/user.model');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const config = require('../config');
const {
  HTTP_STATUS,
  USER_STATUS,
  ROLES,
  SUBSCRIPTION_TIERS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} = require('../constants');

const { SYRIAN_GOVERNORATES } = require('../constants/governorates');

// Simple in-memory user store for demo mode (no database needed!)
const DEMO_USERS = new Map();
let DEMO_USER_ID_COUNTER = 0;

class AuthService {
  /**
   * Register a new user account - with demo mode fallback!
   * @param {Object} data - Registration data
   * @returns {Promise<Object>}
   */
  async register(data) {
    try {
      return await this._registerReal(data);
    } catch (error) {
      if (config.env === 'production' || error instanceof AppError) {
        throw error;
      }

      logger.warn('Real registration failed, falling back to demo mode:', error.message);
      return await this._registerDemo(data);
    }
  }

  /**
   * Start registration: store data temporarily until email OTP is verified.
   * A real User row is created only in verifyEmail.
   */
  async _registerReal(data) {
    const {
      fullName,
      email,
      phoneNumber,
      smartAssistantName,
      password,
      governorateId,
      acceptTerms,
    } = data;

    const governorate = await governorateRepository.resolveByIdOrStatic(governorateId);
    if (!governorate || !governorate.isActive) {
      throw new AppError(ERROR_MESSAGES.GOVERNORATE_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
    }

    const resolvedGovernorateId = governorate.id;

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      if (existingUser.emailVerified || existingUser.status === USER_STATUS.ACTIVE) {
        throw new AppError(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }
      await userRepository.deleteById(existingUser.id);
    }

    const phoneOwner = await userRepository.findByPhone(phoneNumber);
    if (phoneOwner) {
      if (phoneOwner.emailVerified || phoneOwner.status === USER_STATUS.ACTIVE) {
        throw new AppError(ERROR_MESSAGES.PHONE_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }
      await userRepository.deleteById(phoneOwner.id);
    }

    const pendingWithPhone = await pendingRegistrationRepository.findByPhone(phoneNumber);
    if (pendingWithPhone && pendingWithPhone.email !== email) {
      await pendingRegistrationRepository.deleteById(pendingWithPhone.id);
    }

    await pendingRegistrationRepository.deleteExpired();

    const hashedPassword = await hashPassword(password);
    const expiresAt = new Date(Date.now() + config.auth.otpExpirySeconds * 1000);

    const pending = await pendingRegistrationRepository.upsertByEmail({
      fullName,
      email,
      phoneNumber,
      smartAssistantName,
      password: hashedPassword,
      governorateId: resolvedGovernorateId,
      acceptTerms,
      expiresAt,
    });

    const otp = generateOtp();
    await redisService.storeEmailOtp(pending.id, otp);
    await emailService.sendOtp(email, otp, OTP_PURPOSES.EMAIL_VERIFICATION);

    return {
      message: SUCCESS_MESSAGES.REGISTRATION_SUCCESS,
      user: this._toPendingUserResponse(pending, governorate),
      requiresEmailVerification: true,
      isTemporary: true,
    };
  }

  /**
   * Demo mode registration - no database needed!
   */
  async _registerDemo(data) {
    const { fullName, email, phoneNumber, smartAssistantName, governorateId } = data;

    if (DEMO_USERS.has(email)) {
      throw new AppError(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    const governorate = SYRIAN_GOVERNORATES.find((g) => g.id === governorateId);
    if (!governorate) {
      throw new AppError(ERROR_MESSAGES.GOVERNORATE_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
    }

    const userId = `demo-user-${++DEMO_USER_ID_COUNTER}`;
    const passId = `${governorate.code}-${String(DEMO_USER_ID_COUNTER).padStart(6, '0')}`;

    const demoUser = {
      id: userId,
      passId,
      fullName,
      email,
      phoneNumber,
      smartAssistantName,
      emailVerified: false,
      phoneVerified: false,
      status: USER_STATUS.PENDING_VERIFICATION,
      subscription: SUBSCRIPTION_TIERS.FREE,
      governorateId,
      role: { id: 'demo-role-id', name: ROLES.USER },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    DEMO_USERS.set(email, demoUser);

    const otp = generateOtp();
    logger.info(`DEMO MODE: Email verification OTP for ${email}: ${otp}`);

    return {
      message: 'Registration successful (demo mode - no database!)',
      user: demoUser,
      requiresEmailVerification: true,
      isTemporary: true,
      demoMode: true,
    };
  }

  /**
   * Verify email OTP and create the real user account.
   * @param {Object} data - Email and OTP
   * @returns {Promise<Object>}
   */
  async verifyEmail(data) {
    const { email, otp } = data;

    const pending = await pendingRegistrationRepository.findByEmail(email);
    if (pending) {
      if (pending.expiresAt < new Date()) {
        await pendingRegistrationRepository.deleteById(pending.id);
        throw new AppError(ERROR_MESSAGES.INVALID_OTP, HTTP_STATUS.BAD_REQUEST);
      }

      const isValid = await redisService.verifyEmailOtp(pending.id, otp);
      if (!isValid) {
        throw new AppError(ERROR_MESSAGES.INVALID_OTP, HTTP_STATUS.BAD_REQUEST);
      }

      const user = await this._createUserFromPending(pending);
      await pendingRegistrationRepository.deleteById(pending.id);

      return {
        message: SUCCESS_MESSAGES.EMAIL_VERIFIED,
        user: toUserResponse(user),
        isTemporary: false,
      };
    }

    // Legacy path: older signups already stored in users as PENDING_VERIFICATION
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (user.emailVerified) {
      return { message: SUCCESS_MESSAGES.EMAIL_VERIFIED, user: toUserResponse(user) };
    }

    const isValid = await redisService.verifyEmailOtp(user.id, otp);
    if (!isValid) {
      throw new AppError(ERROR_MESSAGES.INVALID_OTP, HTTP_STATUS.BAD_REQUEST);
    }

    const updatedUser = await userRepository.update(user.id, {
      emailVerified: true,
      status: USER_STATUS.ACTIVE,
    });

    return {
      message: SUCCESS_MESSAGES.EMAIL_VERIFIED,
      user: toUserResponse(updatedUser),
    };
  }

  /**
   * Resend email verification OTP.
   * @param {Object} data - Email
   * @returns {Promise<Object>}
   */
  async resendEmailVerification(data) {
    const { email } = data;

    await redisService.checkResendRateLimit(email);

    const pending = await pendingRegistrationRepository.findByEmail(email);
    if (pending) {
      if (pending.expiresAt < new Date()) {
        await pendingRegistrationRepository.deleteById(pending.id);
        return { message: SUCCESS_MESSAGES.VERIFICATION_EMAIL_SENT };
      }

      const expiresAt = new Date(Date.now() + config.auth.otpExpirySeconds * 1000);
      await pendingRegistrationRepository.upsertByEmail({
        fullName: pending.fullName,
        email: pending.email,
        phoneNumber: pending.phoneNumber,
        smartAssistantName: pending.smartAssistantName,
        password: pending.password,
        governorateId: pending.governorateId,
        acceptTerms: pending.acceptTerms,
        expiresAt,
      });

      const otp = generateOtp();
      await redisService.storeEmailOtp(pending.id, otp);
      await emailService.sendOtp(email, otp, OTP_PURPOSES.EMAIL_VERIFICATION);
      return { message: SUCCESS_MESSAGES.VERIFICATION_EMAIL_SENT };
    }

    const user = await userRepository.findByEmail(email);
    if (!user || user.emailVerified) {
      return { message: SUCCESS_MESSAGES.VERIFICATION_EMAIL_SENT };
    }

    const otp = generateOtp();
    await redisService.storeEmailOtp(user.id, otp);
    await emailService.sendOtp(email, otp, OTP_PURPOSES.EMAIL_VERIFICATION);

    return { message: SUCCESS_MESSAGES.VERIFICATION_EMAIL_SENT };
  }

  /**
   * Authenticate user with email/phone and password.
   * @param {Object} data - Login credentials
   * @returns {Promise<Object>}
   */
  async login(data) {
    const { identifier, password } = data;

    let user = await userRepository.findByEmailOrPhone(identifier);

    if (!user && identifier.includes('@')) {
      const business = await businessRepository.findByBusinessEmail(identifier);
      if (
        business?.ownerId &&
        business.owner?.email?.toLowerCase() === business.ownerEmail.toLowerCase()
      ) {
        user = await userRepository.findById(business.ownerId);
      }
    }

    if (!user) {
      if (identifier.includes('@')) {
        const pending = await pendingRegistrationRepository.findByEmail(identifier);
        if (pending) {
          throw new AppError(ERROR_MESSAGES.EMAIL_NOT_VERIFIED, HTTP_STATUS.FORBIDDEN);
        }
      }
      throw new AppError(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new AppError(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    if (!user.emailVerified) {
      throw new AppError(ERROR_MESSAGES.EMAIL_NOT_VERIFIED, HTTP_STATUS.FORBIDDEN);
    }

    if (user.status === USER_STATUS.SUSPENDED) {
      throw new AppError(ERROR_MESSAGES.ACCOUNT_SUSPENDED, HTTP_STATUS.FORBIDDEN);
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      throw new AppError(ERROR_MESSAGES.ACCOUNT_NOT_ACTIVE, HTTP_STATUS.FORBIDDEN);
    }

    const tokens = await this._generateTokenPair(user);

    return {
      message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
      ...toAuthResponse(tokens, user),
    };
  }

  async refreshToken(data) {
    const { refreshToken } = data;

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError(ERROR_MESSAGES.INVALID_REFRESH_TOKEN, HTTP_STATUS.UNAUTHORIZED);
    }

    const storedToken = await refreshTokenRepository.findByJti(decoded.jti);
    if (!storedToken || storedToken.isRevoked) {
      throw new AppError(ERROR_MESSAGES.INVALID_REFRESH_TOKEN, HTTP_STATUS.UNAUTHORIZED);
    }

    if (storedToken.expiresAt < new Date()) {
      throw new AppError(ERROR_MESSAGES.INVALID_REFRESH_TOKEN, HTTP_STATUS.UNAUTHORIZED);
    }

    const tokenHash = hashToken(refreshToken);
    if (storedToken.tokenHash !== tokenHash) {
      await refreshTokenRepository.revokeAllForUser(storedToken.userId);
      throw new AppError(ERROR_MESSAGES.INVALID_REFRESH_TOKEN, HTTP_STATUS.UNAUTHORIZED);
    }

    await refreshTokenRepository.revokeByJti(decoded.jti);

    const user = storedToken.user;
    if (user.status !== USER_STATUS.ACTIVE) {
      throw new AppError(ERROR_MESSAGES.ACCOUNT_NOT_ACTIVE, HTTP_STATUS.FORBIDDEN);
    }

    const tokens = await this._generateTokenPair(user);

    return {
      message: SUCCESS_MESSAGES.TOKEN_REFRESHED,
      ...tokens,
    };
  }

  async logout(data) {
    const { refreshToken } = data;

    try {
      const decoded = verifyRefreshToken(refreshToken);
      await refreshTokenRepository.revokeByJti(decoded.jti);
    } catch {
      // Silently handle invalid tokens on logout
    }

    return { message: SUCCESS_MESSAGES.LOGOUT_SUCCESS };
  }

  async forgotPassword(data) {
    const { email } = data;

    const user = await userRepository.findByEmail(email);

    if (user) {
      const otp = generateOtp();
      await redisService.storePasswordResetOtp(user.id, otp);
      await emailService.sendOtp(email, otp, OTP_PURPOSES.PASSWORD_RESET);
    }

    return { message: SUCCESS_MESSAGES.PASSWORD_RESET_EMAIL_SENT };
  }

  async resetPassword(data) {
    const { email, otp, newPassword } = data;

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError(ERROR_MESSAGES.INVALID_OTP, HTTP_STATUS.BAD_REQUEST);
    }

    const isValid = await redisService.verifyPasswordResetOtp(user.id, otp);
    if (!isValid) {
      throw new AppError(ERROR_MESSAGES.INVALID_OTP, HTTP_STATUS.BAD_REQUEST);
    }

    const hashedPassword = await hashPassword(newPassword);
    await userRepository.update(user.id, { password: hashedPassword });
    await refreshTokenRepository.revokeAllForUser(user.id);

    return { message: SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESS };
  }

  async changePassword(userId, data) {
    const { currentPassword, newPassword } = data;

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const isCurrentValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentValid) {
      throw new AppError(ERROR_MESSAGES.CURRENT_PASSWORD_INCORRECT, HTTP_STATUS.BAD_REQUEST);
    }

    const hashedPassword = await hashPassword(newPassword);
    await userRepository.update(userId, { password: hashedPassword });
    await refreshTokenRepository.revokeAllForUser(userId);

    return { message: SUCCESS_MESSAGES.PASSWORD_CHANGED };
  }

  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return { user: toUserResponse(user) };
  }

  async uploadProfileImage(userId, imageUrl) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const updatedUser = await userRepository.update(userId, {
      profileImage: imageUrl,
      updatedBy: userId,
    });
    await removePublicUpload(user.profileImage);

    return {
      message: SUCCESS_MESSAGES.PROFILE_IMAGE_UPLOADED,
      user: toUserResponse(updatedUser),
    };
  }

  async updateProfile(userId, data) {
    if (data.phoneNumber) {
      const existingPhone = await userRepository.findByPhone(data.phoneNumber);
      if (existingPhone && existingPhone.id !== userId) {
        throw new AppError(ERROR_MESSAGES.PHONE_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    const updatedUser = await userRepository.update(userId, data);

    return {
      message: SUCCESS_MESSAGES.PROFILE_UPDATED,
      user: toUserResponse(updatedUser),
    };
  }

  /**
   * Create ACTIVE verified user from a pending registration.
   * @private
   */
  async _createUserFromPending(pending) {
    const userRole = await roleRepository.findByName(ROLES.USER);
    if (!userRole) {
      throw new AppError(ERROR_MESSAGES.ROLE_NOT_FOUND, HTTP_STATUS.INTERNAL_SERVER_ERROR, false);
    }

    const passId = await governorateRepository.generatePassId(pending.governorateId);

    return userRepository.create({
      passId,
      fullName: pending.fullName,
      email: pending.email,
      phoneNumber: pending.phoneNumber,
      smartAssistantName: pending.smartAssistantName,
      password: pending.password,
      emailVerified: true,
      phoneVerified: false,
      status: USER_STATUS.ACTIVE,
      subscription: SUBSCRIPTION_TIERS.FREE,
      acceptTerms: pending.acceptTerms,
      governorateId: pending.governorateId,
      roleId: userRole.id,
    });
  }

  /**
   * Shape temporary pending signup for Flutter (not a real users row yet).
   * @private
   */
  _toPendingUserResponse(pending, governorate) {
    return {
      id: pending.id,
      passId: null,
      fullName: pending.fullName,
      email: pending.email,
      phoneNumber: pending.phoneNumber,
      smartAssistantName: pending.smartAssistantName,
      profileImage: null,
      emailVerified: false,
      phoneVerified: false,
      status: USER_STATUS.PENDING_VERIFICATION,
      subscription: SUBSCRIPTION_TIERS.FREE,
      governorate: governorate
        ? {
            id: governorate.id,
            name: governorate.name,
            nameAr: governorate.nameAr,
            code: governorate.code,
          }
        : null,
      role: null,
      roles: [],
      createdAt: pending.createdAt,
      updatedAt: pending.updatedAt,
    };
  }

  async _generateTokenPair(user) {
    const accessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      passId: user.passId,
    };

    const jti = generateJti();
    const refreshPayload = {
      sub: user.id,
      jti,
      type: 'refresh',
    };

    const accessToken = generateAccessToken(accessPayload);
    const refreshToken = generateRefreshToken(refreshPayload);

    const expiresAt = this._parseTokenExpiry(config.jwt.refreshExpiresIn);

    await refreshTokenRepository.create({
      jti,
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.expiresIn,
    };
  }

  _parseTokenExpiry(expiresIn) {
    const match = String(expiresIn).match(/^(\d+)([dhms])$/);
    if (!match) {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    const [, num, unit] = match;
    const multipliers = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
    return new Date(Date.now() + parseInt(num, 10) * multipliers[unit]);
  }
}

module.exports = new AuthService();
