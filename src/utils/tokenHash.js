/**
 * Token hashing utility.
 * Securely hashes refresh tokens before database storage.
 */

const crypto = require('crypto');

/**
 * Hash a token using SHA-256.
 * @param {string} token - Plain text token
 * @returns {string} Hex-encoded hash
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate a unique JWT ID for refresh token rotation.
 * @returns {string}
 */
const generateJti = () => {
  return crypto.randomUUID();
};

module.exports = {
  hashToken,
  generateJti,
};
