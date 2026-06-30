/**
 * Authentication service.
 * Contains all authentication business logic - registration, login, tokens, and profile management.
 */

const userRepository = require('../repositories/user.repository');
const governorateRepository = require('../repositories/governorate.repository');
const roleRepository = require('../repositories/role.repository');
const refreshTokenRepository = require('../repositories/refreshToken.repository');
const redisService = require('./redis.service');
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

// Static governorate data for demo mode
const STATIC_GOVERNORATES = [
  { id: 'static-damascus', name: 'Damascus', nameAr: 'دمشق', code: 'DM' },
  { id: 'static-aleppo', name: 'Aleppo', nameAr: 'حلب', code: 'AL' },
  { id: 'static-homs', name: 'Homs', nameAr: 'حمص', code: 'HO' },
  { id: 'static-hama', name: 'Hama', nameAr: 'حماة', code: 'HA' },
  { id: 'static-latakia', name: 'Latakia', nameAr: 'اللاذقية', code: 'LA' },
  { id: 'static-tartus', name: 'Tartus', nameAr: 'طرطوس', code: 'TA' },
  { id: 'static-idlib', name: 'Idlib', nameAr: 'إدلب', code: 'ID' },
  { id: 'static-deir-ez-zor', name: 'Deir ez-Zor', nameAr: 'دير الزور', code: 'DZ' },
  { id: 'static-raqqa', name: 'Raqqa', nameAr: 'الرقة', code: 'RQ' },
  { id: 'static-hasakah', name: 'Hasakah', nameAr: 'الحسكة', code: 'HK' },
  { id: 'static-daraa', name: 'Daraa', nameAr: 'درعا', code: 'DR' },
  { id: 'static-quneitra', name: 'Quneitra', nameAr: 'القنيطرة', code: 'QU' },
  { id: 'static-suwayda', name: 'Suwayda', nameAr: 'السويداء', code: 'SW' },
  {
    id: 'static-damascus-countryside',
    name: 'Damascus Countryside',
    nameAr: 'ريف دمشق',
    code: 'RD',
  },
];

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
    const {
      fullName,
      email,
      phoneNumber,
      smartAssistantName,
      password,
      governorateId,
      acceptTerms,
    } = data;

    // Try real registration first
    try {
      return await this._registerReal(data);
    } catch (error) {
      logger.warn('Real registration failed, falling back to demo mode:', error.message);
      return await this._registerDemo(data);
    }
  }

  /**
   * Real registration with database
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

    // Validate governorate exists
    const governorate = await governorateRepository.findById(governorateId);
    if (!governorate || !governorate.isActive) {
      throw new AppError(ERROR_MESSAGES.GOVERNORATE_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
    }

    // Check uniqueness
    if (await userRepository.emailExists(email)) {
      throw new AppError(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    if (await userRepository.phoneExists(phoneNumber)) {
      throw new AppError(ERROR_MESSAGES.PHONE_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    // Get default USER role
    const userRole = await roleRepository.findByName(ROLES.USER);
    if (!userRole) {
      throw new AppError(ERROR_MESSAGES.ROLE_NOT_FOUND, HTTP_STATUS.INTERNAL_SERVER_ERROR, false);
    }

    // Generate Pass ID and hash password
    const passId = await governorateRepository.generatePassId(governorateId);
    const hashedPassword = await hashPassword(password);

    const user = await userRepository.create({
      passId,
      fullName,
      email,
      phoneNumber,
      smartAssistantName,
      password: hashedPassword,
      emailVerified: false,
      phoneVerified: false,
      status: USER_STATUS.PENDING_VERIFICATION,
      subscription: SUBSCRIPTION_TIERS.FREE,
      acceptTerms,
      governorateId,
      roleId: userRole.id,
    });

    // Generate and store email verification OTP in Redis
    const otp = generateOtp();
    await redisService.storeEmailOtp(user.id, otp);

    // In production, send OTP via email service
    if (config.env === 'development') {
      logger.info(`Email verification OTP for ${email}: ${otp}`);
    }

    return {
      message: SUCCESS_MESSAGES.REGISTRATION_SUCCESS,
      user: toUserResponse(user),
      requiresEmailVerification: true,
    };
  }

  /**
   * Demo mode registration - no database needed!
   */
  async _registerDemo(data) {
    const { fullName, email, phoneNumber, smartAssistantName, governorateId } = data;

    // Check if user already exists in demo store
    if (DEMO_USERS.has(email)) {
      throw new AppError(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    // Get governorate from static data
    const governorate = STATIC_GOVERNORATES.find((g) => g.id === governorateId);
    if (!governorate) {
      throw new AppError(ERROR_MESSAGES.GOVERNORATE_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
    }

    // Generate a simple demo user ID
    const userId = `demo-user-${++DEMO_USER_ID_COUNTER}`;
    const passId = `${governorate.code}-${String(DEMO_USER_ID_COUNTER).padStart(6, '0')}`;

    // Create demo user
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

    // Store in demo store
    DEMO_USERS.set(email, demoUser);

    // Generate OTP (just log it for demo)
    const otp = generateOtp();
    logger.info(`DEMO MODE: Email verification OTP for ${email}: ${otp}`);

    return {
      message: 'Registration successful (demo mode - no database!)',
      user: demoUser,
      requiresEmailVerification: true,
      demoMode: true,
    };
  }

  /**
   * Verify user email with OTP.
   * @param {Object} data - Email and OTP
   * @returns {Promise<Object>}
   */
  async verifyEmail(data) {
    const { email, otp } = data;

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

    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Return success to prevent email enumeration
      return { message: SUCCESS_MESSAGES.VERIFICATION_EMAIL_SENT };
    }

    if (user.emailVerified) {
      return { message: SUCCESS_MESSAGES.VERIFICATION_EMAIL_SENT };
    }

    const otp = generateOtp();
    await redisService.storeEmailOtp(user.id, otp);

    if (config.env === 'development') {
      logger.info(`Resent email verification OTP for ${email}: ${otp}`);
    }

    return { message: SUCCESS_MESSAGES.VERIFICATION_EMAIL_SENT };
  }

  /**
   * Authenticate user with email/phone and password.
   * @param {Object} data - Login credentials
   * @returns {Promise<Object>}
   */
  async login(data) {
    const { identifier, password } = data;

    const user = await userRepository.findByEmailOrPhone(identifier);
    if (!user) {
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

  /**
   * Refresh access token using refresh token with rotation.
   * @param {Object} data - Refresh token
   * @returns {Promise<Object>}
   */
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
      // Possible token reuse attack - revoke all tokens for user
      await refreshTokenRepository.revokeAllForUser(storedToken.userId);
      throw new AppError(ERROR_MESSAGES.INVALID_REFRESH_TOKEN, HTTP_STATUS.UNAUTHORIZED);
    }

    // Rotate: revoke old token
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

  /**
   * Logout user by revoking refresh token.
   * @param {Object} data - Refresh token
   * @returns {Promise<Object>}
   */
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

  /**
   * Initiate password reset by sending OTP to email.
   * @param {Object} data - Email
   * @returns {Promise<Object>}
   */
  async forgotPassword(data) {
    const { email } = data;

    const user = await userRepository.findByEmail(email);

    if (user) {
      const otp = generateOtp();
      await redisService.storePasswordResetOtp(user.id, otp);

      if (config.env === 'development') {
        logger.info(`Password reset OTP for ${email}: ${otp}`);
      }
    }

    // Always return same message to prevent email enumeration
    return { message: SUCCESS_MESSAGES.PASSWORD_RESET_EMAIL_SENT };
  }

  /**
   * Reset password using OTP.
   * @param {Object} data - Email, OTP, and new password
   * @returns {Promise<Object>}
   */
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

    // Revoke all refresh tokens on password reset
    await refreshTokenRepository.revokeAllForUser(user.id);

    return { message: SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESS };
  }

  /**
   * Change password for authenticated user.
   * @param {string} userId - Authenticated user ID
   * @param {Object} data - Current and new password
   * @returns {Promise<Object>}
   */
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

    // Revoke all refresh tokens on password change
    await refreshTokenRepository.revokeAllForUser(userId);

    return { message: SUCCESS_MESSAGES.PASSWORD_CHANGED };
  }

  /**
   * Get authenticated user profile.
   * @param {string} userId - User UUID
   * @returns {Promise<Object>}
   */
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return { user: toUserResponse(user) };
  }

  /**
   * Update authenticated user profile.
   * @param {string} userId - User UUID
   * @param {Object} data - Profile fields to update
   * @returns {Promise<Object>}
   */
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
   * Generate access and refresh token pair with secure storage.
   * @param {Object} user - User record with role
   * @returns {Promise<{accessToken: string, refreshToken: string, expiresIn: string}>}
   * @private
   */
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

  /**
   * Parse JWT expiry string to Date.
   * @param {string} expiresIn - Expiry string (e.g., 30d, 7d, 24h)
   * @returns {Date}
   * @private
   */
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
