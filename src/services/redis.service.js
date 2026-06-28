/**
 * Redis cache service.
 * Manages OTP storage, rate limiting, and ephemeral auth data in Redis.
 */

const { getRedisClient, isRedisAvailable } = require('../config/redis');
const config = require('../config');
const { REDIS_KEYS } = require('../constants');
const AppError = require('../utils/AppError');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants');
const logger = require('../utils/logger');

/**
 * Get Redis client or throw if unavailable.
 * @returns {import('ioredis').default}
 */
const getClient = () => {
  const client = getRedisClient();

  if (!client || !isRedisAvailable()) {
    if (config.env === 'development') {
      logger.warn('Redis unavailable - OTP operation skipped in development');
      throw new AppError(
        'Redis is not running. Start Redis to use email verification and password reset.',
        HTTP_STATUS.SERVICE_UNAVAILABLE,
      );
    }

    throw new AppError('Redis is not available', HTTP_STATUS.SERVICE_UNAVAILABLE, false);
  }

  return client;
};

/**
 * Store email verification OTP for a user.
 * @param {string} userId - User UUID
 * @param {string} otp - OTP code
 * @returns {Promise<void>}
 */
const storeEmailOtp = async (userId, otp) => {
  const client = getClient();
  const key = REDIS_KEYS.EMAIL_OTP(userId);
  await client.setex(key, config.auth.otpExpirySeconds, otp);
};

/**
 * Verify and consume email OTP.
 * @param {string} userId - User UUID
 * @param {string} otp - OTP code to verify
 * @returns {Promise<boolean>}
 */
const verifyEmailOtp = async (userId, otp) => {
  const client = getClient();
  const key = REDIS_KEYS.EMAIL_OTP(userId);
  const storedOtp = await client.get(key);

  if (!storedOtp) {
    return false;
  }

  if (storedOtp !== otp) {
    return false;
  }

  await client.del(key);
  return true;
};

/**
 * Store password reset OTP for a user.
 * @param {string} userId - User UUID
 * @param {string} otp - OTP code
 * @returns {Promise<void>}
 */
const storePasswordResetOtp = async (userId, otp) => {
  const client = getClient();
  const key = REDIS_KEYS.PASSWORD_RESET_OTP(userId);
  await client.setex(key, config.auth.passwordResetOtpExpirySeconds, otp);
};

/**
 * Verify and consume password reset OTP.
 * @param {string} userId - User UUID
 * @param {string} otp - OTP code to verify
 * @returns {Promise<boolean>}
 */
const verifyPasswordResetOtp = async (userId, otp) => {
  const client = getClient();
  const key = REDIS_KEYS.PASSWORD_RESET_OTP(userId);
  const storedOtp = await client.get(key);

  if (!storedOtp) {
    return false;
  }

  if (storedOtp !== otp) {
    return false;
  }

  await client.del(key);
  return true;
};

/**
 * Check and set resend rate limit for email verification.
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
const checkResendRateLimit = async (email) => {
  const client = getClient();
  const key = REDIS_KEYS.RESEND_RATE_LIMIT(email);
  const exists = await client.get(key);

  if (exists) {
    throw new AppError(ERROR_MESSAGES.RESEND_RATE_LIMIT, HTTP_STATUS.TOO_MANY_REQUESTS);
  }

  await client.setex(key, config.auth.resendCooldownSeconds, '1');
};

module.exports = {
  storeEmailOtp,
  verifyEmailOtp,
  storePasswordResetOtp,
  verifyPasswordResetOtp,
  checkResendRateLimit,
};
