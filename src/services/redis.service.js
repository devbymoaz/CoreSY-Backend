/**
 * Redis cache service - completely optional.
 * If Redis is not available, operations are skipped gracefully.
 */

const { getRedisClient, isRedisAvailable } = require('../config/redis');
const config = require('../config');
const { REDIS_KEYS } = require('../constants');
const logger = require('../utils/logger');

// In-memory storage for when Redis is not available (for development)
const inMemoryStore = new Map();

/**
 * Get Redis client if available, otherwise null.
 * @returns {import('ioredis').default|null}
 */
const getClient = () => {
  const client = getRedisClient();
  if (!client || !isRedisAvailable()) {
    logger.warn('Redis unavailable - using in-memory storage as fallback');
    return null;
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

  if (client) {
    const key = REDIS_KEYS.EMAIL_OTP(userId);
    await client.setex(key, config.auth.otpExpirySeconds, otp);
  } else {
    // Fallback to in-memory storage
    const key = `email-otp:${userId}`;
    inMemoryStore.set(key, { otp, expires: Date.now() + config.auth.otpExpirySeconds * 1000 });
    logger.info(`Stored OTP in memory (Redis unavailable): ${otp}`);
  }

  // Always log the OTP for development/testing
  logger.info(`Email verification OTP for user ${userId}: ${otp}`);
};

/**
 * Verify and consume email OTP.
 * @param {string} userId - User UUID
 * @param {string} otp - OTP code to verify
 * @returns {Promise<boolean>}
 */
const verifyEmailOtp = async (userId, otp) => {
  const client = getClient();

  if (client) {
    const key = REDIS_KEYS.EMAIL_OTP(userId);
    const storedOtp = await client.get(key);

    if (!storedOtp) return false;
    if (storedOtp !== otp) return false;

    await client.del(key);
    return true;
  } else {
    // Fallback to in-memory storage
    const key = `email-otp:${userId}`;
    const stored = inMemoryStore.get(key);

    if (!stored || stored.expires < Date.now()) {
      inMemoryStore.delete(key);
      return false;
    }

    if (stored.otp !== otp) return false;

    inMemoryStore.delete(key);
    return true;
  }
};

/**
 * Store password reset OTP for a user.
 * @param {string} userId - User UUID
 * @param {string} otp - OTP code
 * @returns {Promise<void>}
 */
const storePasswordResetOtp = async (userId, otp) => {
  const client = getClient();

  if (client) {
    const key = REDIS_KEYS.PASSWORD_RESET_OTP(userId);
    await client.setex(key, config.auth.passwordResetOtpExpirySeconds, otp);
  } else {
    // Fallback to in-memory storage
    const key = `password-reset-otp:${userId}`;
    inMemoryStore.set(key, {
      otp,
      expires: Date.now() + config.auth.passwordResetOtpExpirySeconds * 1000,
    });
    logger.info(`Stored password reset OTP in memory (Redis unavailable): ${otp}`);
  }

  logger.info(`Password reset OTP for user ${userId}: ${otp}`);
};

/**
 * Verify and consume password reset OTP.
 * @param {string} userId - User UUID
 * @param {string} otp - OTP code to verify
 * @returns {Promise<boolean>}
 */
const verifyPasswordResetOtp = async (userId, otp) => {
  const client = getClient();

  if (client) {
    const key = REDIS_KEYS.PASSWORD_RESET_OTP(userId);
    const storedOtp = await client.get(key);

    if (!storedOtp) return false;
    if (storedOtp !== otp) return false;

    await client.del(key);
    return true;
  } else {
    // Fallback to in-memory storage
    const key = `password-reset-otp:${userId}`;
    const stored = inMemoryStore.get(key);

    if (!stored || stored.expires < Date.now()) {
      inMemoryStore.delete(key);
      return false;
    }

    if (stored.otp !== otp) return false;

    inMemoryStore.delete(key);
    return true;
  }
};

/**
 * Check and set resend rate limit for email verification.
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
const checkResendRateLimit = async (email) => {
  const client = getClient();

  if (client) {
    const key = REDIS_KEYS.RESEND_RATE_LIMIT(email);
    const exists = await client.get(key);
    if (exists) {
      // In development, skip rate limit
      if (config.env === 'development') {
        logger.warn('Rate limit would be enforced, but skipping in development');
        return;
      }
    }
    await client.setex(key, config.auth.resendCooldownSeconds, '1');
  }
  // If no Redis, skip rate limiting entirely
  logger.warn('Rate limiting skipped (Redis unavailable)');
};

module.exports = {
  storeEmailOtp,
  verifyEmailOtp,
  storePasswordResetOtp,
  verifyPasswordResetOtp,
  checkResendRateLimit,
};
