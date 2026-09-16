/**
 * Redis cache service - completely optional.
 * If Redis is not available, operations fall back to in-memory storage.
 */

const crypto = require('crypto');
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
    return null;
  }
  return client;
};

/**
 * Normalize OTP to a trimmed string for strict comparison.
 * @param {unknown} otp
 * @returns {string}
 */
const normalizeOtp = (otp) => String(otp ?? '').trim();

/**
 * Constant-time string comparison.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
const safeEqual = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
};

/**
 * Store email verification OTP for a user.
 * @param {string} userId - User UUID
 * @param {string} otp - OTP code
 * @returns {Promise<void>}
 */
const storeEmailOtp = async (userId, otp) => {
  const normalizedOtp = normalizeOtp(otp);
  const client = getClient();

  if (client) {
    const key = REDIS_KEYS.EMAIL_OTP(userId);
    await client.setex(key, config.auth.otpExpirySeconds, normalizedOtp);
  } else {
    const key = `email-otp:${userId}`;
    inMemoryStore.set(key, {
      otp: normalizedOtp,
      expires: Date.now() + config.auth.otpExpirySeconds * 1000,
    });
    logger.info(`Stored OTP in memory (Redis unavailable): ${normalizedOtp}`);
  }

  logger.info(`Email verification OTP for user ${userId}: ${normalizedOtp}`);
};

/**
 * Verify and consume email OTP.
 * @param {string} userId - User UUID
 * @param {string} otp - OTP code to verify
 * @returns {Promise<boolean>}
 */
const verifyEmailOtp = async (userId, otp) => {
  const normalizedOtp = normalizeOtp(otp);
  if (!normalizedOtp) return false;

  const client = getClient();

  if (client) {
    const key = REDIS_KEYS.EMAIL_OTP(userId);
    const storedOtp = await client.get(key);
    if (!storedOtp || !safeEqual(storedOtp, normalizedOtp)) return false;
    await client.del(key);
    return true;
  }

  const key = `email-otp:${userId}`;
  const stored = inMemoryStore.get(key);
  if (!stored || stored.expires < Date.now()) {
    inMemoryStore.delete(key);
    return false;
  }
  if (!safeEqual(stored.otp, normalizedOtp)) return false;
  inMemoryStore.delete(key);
  return true;
};

/**
 * Store password reset OTP for a user.
 * @param {string} userId - User UUID
 * @param {string} otp - OTP code
 * @returns {Promise<void>}
 */
const storePasswordResetOtp = async (userId, otp) => {
  const normalizedOtp = normalizeOtp(otp);
  const client = getClient();

  // Clear any previous verified reset token when a new OTP is issued
  await clearPasswordResetToken(userId);

  if (client) {
    const key = REDIS_KEYS.PASSWORD_RESET_OTP(userId);
    await client.setex(key, config.auth.passwordResetOtpExpirySeconds, normalizedOtp);
  } else {
    const key = `password-reset-otp:${userId}`;
    inMemoryStore.set(key, {
      otp: normalizedOtp,
      expires: Date.now() + config.auth.passwordResetOtpExpirySeconds * 1000,
    });
    logger.info(`Stored password reset OTP in memory (Redis unavailable): ${normalizedOtp}`);
  }

  logger.info(`Password reset OTP for user ${userId}: ${normalizedOtp}`);
};

/**
 * Peek password reset OTP without consuming it.
 * @param {string} userId
 * @param {string} otp
 * @returns {Promise<boolean>}
 */
const peekPasswordResetOtp = async (userId, otp) => {
  const normalizedOtp = normalizeOtp(otp);
  if (!normalizedOtp) return false;

  const client = getClient();

  if (client) {
    const key = REDIS_KEYS.PASSWORD_RESET_OTP(userId);
    const storedOtp = await client.get(key);
    return Boolean(storedOtp && safeEqual(storedOtp, normalizedOtp));
  }

  const key = `password-reset-otp:${userId}`;
  const stored = inMemoryStore.get(key);
  if (!stored || stored.expires < Date.now()) {
    inMemoryStore.delete(key);
    return false;
  }
  return safeEqual(stored.otp, normalizedOtp);
};

/**
 * Verify and consume password reset OTP.
 * @param {string} userId - User UUID
 * @param {string} otp - OTP code to verify
 * @returns {Promise<boolean>}
 */
const verifyPasswordResetOtp = async (userId, otp) => {
  const normalizedOtp = normalizeOtp(otp);
  if (!normalizedOtp) return false;

  const client = getClient();

  if (client) {
    const key = REDIS_KEYS.PASSWORD_RESET_OTP(userId);
    const storedOtp = await client.get(key);
    if (!storedOtp || !safeEqual(storedOtp, normalizedOtp)) return false;
    await client.del(key);
    return true;
  }

  const key = `password-reset-otp:${userId}`;
  const stored = inMemoryStore.get(key);
  if (!stored || stored.expires < Date.now()) {
    inMemoryStore.delete(key);
    return false;
  }
  if (!safeEqual(stored.otp, normalizedOtp)) return false;
  inMemoryStore.delete(key);
  return true;
};

/**
 * Store a short-lived password reset token after OTP verification.
 * @param {string} userId
 * @param {string} resetToken
 * @returns {Promise<void>}
 */
const storePasswordResetToken = async (userId, resetToken) => {
  const client = getClient();
  const ttl = config.auth.passwordResetOtpExpirySeconds;

  if (client) {
    const key = REDIS_KEYS.PASSWORD_RESET_TOKEN(userId);
    await client.setex(key, ttl, resetToken);
    return;
  }

  const key = `password-reset-token:${userId}`;
  inMemoryStore.set(key, {
    token: resetToken,
    expires: Date.now() + ttl * 1000,
  });
};

/**
 * Verify and consume password reset token.
 * @param {string} userId
 * @param {string} resetToken
 * @returns {Promise<boolean>}
 */
const verifyPasswordResetToken = async (userId, resetToken) => {
  const token = String(resetToken ?? '').trim();
  if (!token) return false;

  const client = getClient();

  if (client) {
    const key = REDIS_KEYS.PASSWORD_RESET_TOKEN(userId);
    const stored = await client.get(key);
    if (!stored || !safeEqual(stored, token)) return false;
    await client.del(key);
    return true;
  }

  const key = `password-reset-token:${userId}`;
  const stored = inMemoryStore.get(key);
  if (!stored || stored.expires < Date.now()) {
    inMemoryStore.delete(key);
    return false;
  }
  if (!safeEqual(stored.token, token)) return false;
  inMemoryStore.delete(key);
  return true;
};

/**
 * Clear password reset token for a user.
 * @param {string} userId
 * @returns {Promise<void>}
 */
const clearPasswordResetToken = async (userId) => {
  const client = getClient();
  if (client) {
    await client.del(REDIS_KEYS.PASSWORD_RESET_TOKEN(userId));
    return;
  }
  inMemoryStore.delete(`password-reset-token:${userId}`);
};

/**
 * Check and set resend rate limit for email verification.
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
const checkResendRateLimit = async (email) => {
  const client = getClient();

  if (!client) {
    return;
  }

  const key = REDIS_KEYS.RESEND_RATE_LIMIT(email);
  const exists = await client.get(key);
  if (exists) {
    if (config.env === 'development') {
      logger.warn('Rate limit would be enforced, but skipping in development');
      return;
    }
  }
  await client.setex(key, config.auth.resendCooldownSeconds, '1');
};

module.exports = {
  storeEmailOtp,
  verifyEmailOtp,
  storePasswordResetOtp,
  peekPasswordResetOtp,
  verifyPasswordResetOtp,
  storePasswordResetToken,
  verifyPasswordResetToken,
  clearPasswordResetToken,
  checkResendRateLimit,
};
