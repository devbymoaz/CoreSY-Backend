/**
 * Password strength validation utility.
 * Enforces enterprise-grade password requirements.
 */

const { ERROR_MESSAGES } = require('../constants');

const PASSWORD_RULES = [
  { test: (p) => p.length >= 8, message: 'Password must be at least 8 characters' },
  { test: (p) => /[A-Z]/.test(p), message: 'Password must contain at least one uppercase letter' },
  { test: (p) => /[a-z]/.test(p), message: 'Password must contain at least one lowercase letter' },
  { test: (p) => /[0-9]/.test(p), message: 'Password must contain at least one number' },
  {
    test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p),
    message: 'Password must contain at least one special character',
  },
];

/**
 * Validate password strength against all rules.
 * @param {string} password - Password to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validatePasswordStrength = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }

  const errors = PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.message);

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate password and return first error message or null.
 * @param {string} password - Password to validate
 * @returns {string|null}
 */
const getPasswordStrengthError = (password) => {
  const { valid, errors } = validatePasswordStrength(password);
  return valid ? null : errors[0] || ERROR_MESSAGES.WEAK_PASSWORD;
};

module.exports = {
  validatePasswordStrength,
  getPasswordStrengthError,
};
