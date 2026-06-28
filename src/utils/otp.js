/**
 * OTP generation utility.
 * Generates cryptographically secure numeric OTP codes.
 */

const crypto = require('crypto');
const config = require('../config');

/**
 * Generate a numeric OTP of configured length.
 * @returns {string}
 */
const generateOtp = () => {
  const length = config.auth.otpLength;
  const max = 10 ** length;
  const otp = crypto.randomInt(0, max);
  return String(otp).padStart(length, '0');
};

module.exports = {
  generateOtp,
};
