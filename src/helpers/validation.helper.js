/**
 * Validation helper utilities.
 * Provides reusable validation result builders for request validators.
 */

/**
 * Build a successful validation result.
 * @param {Object} value - Sanitized value
 * @returns {{ error: null, value: Object }}
 */
const validationSuccess = (value) => ({
  error: null,
  value,
});

/**
 * Build a failed validation result.
 * @param {Array<{path: string[], message: string}>} errors - Validation errors
 * @returns {{ error: Object, value: null }}
 */
const validationFailure = (errors) => ({
  error: { details: errors },
  value: null,
});

/**
 * Add a field error to the errors array.
 * @param {Array} errors - Errors accumulator
 * @param {string} field - Field name
 * @param {string} message - Error message
 */
const addError = (errors, field, message) => {
  errors.push({ path: [field], message });
};

/**
 * Validate email format.
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate Syrian phone number format (supports +963 and 09 formats).
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^(\+963|0)?9[0-9]{8}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
};

/**
 * Normalize phone number to +963 format.
 * @param {string} phone - Raw phone number
 * @returns {string}
 */
const normalizePhone = (phone) => {
  const cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+963')) return cleaned;
  if (cleaned.startsWith('09')) return `+963${cleaned.slice(1)}`;
  if (cleaned.startsWith('9')) return `+963${cleaned}`;
  return cleaned;
};

module.exports = {
  validationSuccess,
  validationFailure,
  addError,
  isValidEmail,
  isValidPhone,
  normalizePhone,
};
