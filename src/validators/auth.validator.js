/**
 * Authentication request validators.
 * Validates all auth-related request payloads before reaching controllers.
 */

const {
  validationSuccess,
  validationFailure,
  addError,
  isValidEmail,
  isValidPhone,
  normalizePhone,
} = require('../helpers/validation.helper');
const { getPasswordStrengthError } = require('../utils/passwordStrength');
const { ERROR_MESSAGES } = require('../constants');

/**
 * Validate user registration data.
 * @param {Object} data - Request body
 * @returns {{ error: Object|null, value: Object }}
 */
const validateRegister = (data) => {
  const errors = [];

  if (!data.fullName || typeof data.fullName !== 'string' || data.fullName.trim().length < 2) {
    addError(errors, 'fullName', 'Full name is required and must be at least 2 characters');
  }

  if (!data.email || !isValidEmail(data.email)) {
    addError(errors, 'email', 'A valid email address is required');
  }

  if (!data.phoneNumber || !isValidPhone(data.phoneNumber)) {
    addError(
      errors,
      'phoneNumber',
      'A valid Syrian phone number is required (e.g., +9639XXXXXXXX)',
    );
  }

  if (
    data.smartAssistantName &&
    (typeof data.smartAssistantName !== 'string' || data.smartAssistantName.trim().length < 2)
  ) {
    addError(errors, 'smartAssistantName', 'Smart assistant name must be at least 2 characters');
  }

  const passwordError = getPasswordStrengthError(data.password);
  if (passwordError) {
    addError(errors, 'password', passwordError);
  }

  if (!data.confirmPassword || data.password !== data.confirmPassword) {
    addError(errors, 'confirmPassword', ERROR_MESSAGES.PASSWORD_MISMATCH);
  }

  if (!data.governorateId || typeof data.governorateId !== 'string') {
    addError(errors, 'governorateId', 'Governorate is required');
  }

  if (data.acceptTerms !== true) {
    addError(errors, 'acceptTerms', ERROR_MESSAGES.TERMS_NOT_ACCEPTED);
  }

  if (errors.length > 0) {
    return validationFailure(errors);
  }

  return validationSuccess({
    fullName: data.fullName.trim(),
    email: data.email.toLowerCase().trim(),
    phoneNumber: normalizePhone(data.phoneNumber),
    smartAssistantName: data.smartAssistantName?.trim() || null,
    password: data.password,
    governorateId: data.governorateId,
    acceptTerms: true,
  });
};

/**
 * Validate email verification data.
 * @param {Object} data - Request body
 * @returns {{ error: Object|null, value: Object }}
 */
const validateVerifyEmail = (data) => {
  const errors = [];

  if (!data.email || !isValidEmail(data.email)) {
    addError(errors, 'email', 'A valid email address is required');
  }

  if (!data.otp || typeof data.otp !== 'string' || data.otp.length < 4) {
    addError(errors, 'otp', 'A valid verification code is required');
  }

  if (errors.length > 0) {
    return validationFailure(errors);
  }

  return validationSuccess({
    email: data.email.toLowerCase().trim(),
    otp: data.otp.trim(),
  });
};

/**
 * Validate resend email verification data.
 * @param {Object} data - Request body
 * @returns {{ error: Object|null, value: Object }}
 */
const validateResendVerification = (data) => {
  const errors = [];

  if (!data.email || !isValidEmail(data.email)) {
    addError(errors, 'email', 'A valid email address is required');
  }

  if (errors.length > 0) {
    return validationFailure(errors);
  }

  return validationSuccess({
    email: data.email.toLowerCase().trim(),
  });
};

/**
 * Validate user login data (email or phone + password).
 * @param {Object} data - Request body
 * @returns {{ error: Object|null, value: Object }}
 */
const validateLogin = (data) => {
  const errors = [];

  if (!data.identifier || typeof data.identifier !== 'string') {
    addError(errors, 'identifier', 'Email or phone number is required');
  }

  if (!data.password || typeof data.password !== 'string') {
    addError(errors, 'password', 'Password is required');
  }

  if (errors.length > 0) {
    return validationFailure(errors);
  }

  const identifier = data.identifier.trim();
  const isEmail = identifier.includes('@');
  const normalizedIdentifier = isEmail ? identifier.toLowerCase() : normalizePhone(identifier);

  return validationSuccess({
    identifier: normalizedIdentifier,
    password: data.password,
  });
};

/**
 * Validate refresh token request.
 * @param {Object} data - Request body
 * @returns {{ error: Object|null, value: Object }}
 */
const validateRefreshToken = (data) => {
  const errors = [];

  if (!data.refreshToken || typeof data.refreshToken !== 'string') {
    addError(errors, 'refreshToken', 'Refresh token is required');
  }

  if (errors.length > 0) {
    return validationFailure(errors);
  }

  return validationSuccess({
    refreshToken: data.refreshToken,
  });
};

/**
 * Validate logout request.
 * @param {Object} data - Request body
 * @returns {{ error: Object|null, value: Object }}
 */
const validateLogout = (data) => {
  const errors = [];

  if (!data.refreshToken || typeof data.refreshToken !== 'string') {
    addError(errors, 'refreshToken', 'Refresh token is required');
  }

  if (errors.length > 0) {
    return validationFailure(errors);
  }

  return validationSuccess({
    refreshToken: data.refreshToken,
  });
};

/**
 * Validate forgot password request.
 * @param {Object} data - Request body
 * @returns {{ error: Object|null, value: Object }}
 */
const validateForgotPassword = (data) => {
  const errors = [];

  if (!data.email || !isValidEmail(data.email)) {
    addError(errors, 'email', 'A valid email address is required');
  }

  if (errors.length > 0) {
    return validationFailure(errors);
  }

  return validationSuccess({
    email: data.email.toLowerCase().trim(),
  });
};

/**
 * Validate reset password request.
 * @param {Object} data - Request body
 * @returns {{ error: Object|null, value: Object }}
 */
const validateResetPassword = (data) => {
  const errors = [];

  if (!data.email || !isValidEmail(data.email)) {
    addError(errors, 'email', 'A valid email address is required');
  }

  if (!data.otp || typeof data.otp !== 'string') {
    addError(errors, 'otp', 'Verification code is required');
  }

  const passwordError = getPasswordStrengthError(data.newPassword);
  if (passwordError) {
    addError(errors, 'newPassword', passwordError);
  }

  if (!data.confirmPassword || data.newPassword !== data.confirmPassword) {
    addError(errors, 'confirmPassword', ERROR_MESSAGES.PASSWORD_MISMATCH);
  }

  if (errors.length > 0) {
    return validationFailure(errors);
  }

  return validationSuccess({
    email: data.email.toLowerCase().trim(),
    otp: data.otp.trim(),
    newPassword: data.newPassword,
  });
};

/**
 * Validate change password request.
 * @param {Object} data - Request body
 * @returns {{ error: Object|null, value: Object }}
 */
const validateChangePassword = (data) => {
  const errors = [];

  if (!data.currentPassword || typeof data.currentPassword !== 'string') {
    addError(errors, 'currentPassword', 'Current password is required');
  }

  const passwordError = getPasswordStrengthError(data.newPassword);
  if (passwordError) {
    addError(errors, 'newPassword', passwordError);
  }

  if (!data.confirmPassword || data.newPassword !== data.confirmPassword) {
    addError(errors, 'confirmPassword', ERROR_MESSAGES.PASSWORD_MISMATCH);
  }

  if (errors.length > 0) {
    return validationFailure(errors);
  }

  return validationSuccess({
    currentPassword: data.currentPassword,
    newPassword: data.newPassword,
  });
};

/**
 * Validate profile update data.
 * @param {Object} data - Request body
 * @returns {{ error: Object|null, value: Object }}
 */
const validateUpdateProfile = (data) => {
  const errors = [];
  const updateData = {};

  if (data.fullName !== undefined) {
    if (typeof data.fullName !== 'string' || data.fullName.trim().length < 2) {
      addError(errors, 'fullName', 'Full name must be at least 2 characters');
    } else {
      updateData.fullName = data.fullName.trim();
    }
  }

  if (data.smartAssistantName !== undefined) {
    if (data.smartAssistantName === null || data.smartAssistantName === '') {
      updateData.smartAssistantName = null;
    } else if (
      typeof data.smartAssistantName !== 'string' ||
      data.smartAssistantName.trim().length < 2
    ) {
      addError(errors, 'smartAssistantName', 'Smart assistant name must be at least 2 characters');
    } else {
      updateData.smartAssistantName = data.smartAssistantName.trim();
    }
  }

  if (data.phoneNumber !== undefined) {
    if (!isValidPhone(data.phoneNumber)) {
      addError(errors, 'phoneNumber', 'A valid Syrian phone number is required');
    } else {
      updateData.phoneNumber = normalizePhone(data.phoneNumber);
    }
  }

  if (Object.keys(updateData).length === 0 && errors.length === 0) {
    addError(errors, 'body', 'At least one field must be provided for update');
  }

  if (errors.length > 0) {
    return validationFailure(errors);
  }

  return validationSuccess(updateData);
};

module.exports = {
  validateRegister,
  validateVerifyEmail,
  validateResendVerification,
  validateLogin,
  validateRefreshToken,
  validateLogout,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateUpdateProfile,
};
