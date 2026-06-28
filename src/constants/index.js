/**
 * Application-wide constants.
 * Centralizes magic strings, HTTP status codes, and error messages.
 */

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

const USER_STATUS = {
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
};

const ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
};

const SUBSCRIPTION_TIERS = {
  FREE: 'FREE',
  PREMIUM: 'PREMIUM',
  ENTERPRISE: 'ENTERPRISE',
};

const REDIS_KEYS = {
  EMAIL_OTP: (userId) => `email_otp:${userId}`,
  PASSWORD_RESET_OTP: (userId) => `password_reset_otp:${userId}`,
  RESEND_RATE_LIMIT: (email) => `resend_rate:${email}`,
};

const ERROR_MESSAGES = {
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  NOT_FOUND: 'The requested resource was not found.',
  UNAUTHORIZED: 'Authentication required. Please provide a valid token.',
  FORBIDDEN: 'You do not have permission to access this resource.',
  VALIDATION_ERROR: 'Validation failed. Please check your input.',
  INVALID_TOKEN: 'Invalid or expired token.',
  USER_NOT_FOUND: 'User not found.',
  EMAIL_ALREADY_EXISTS: 'A user with this email already exists.',
  PHONE_ALREADY_EXISTS: 'A user with this phone number already exists.',
  INVALID_CREDENTIALS: 'Invalid email/phone or password.',
  EMAIL_NOT_VERIFIED: 'Please verify your email before logging in.',
  ACCOUNT_NOT_ACTIVE: 'Your account is not active. Please contact support.',
  ACCOUNT_SUSPENDED: 'Your account has been suspended.',
  GOVERNORATE_NOT_FOUND: 'The selected governorate does not exist.',
  INVALID_OTP: 'Invalid or expired verification code.',
  OTP_EXPIRED: 'Verification code has expired. Please request a new one.',
  PASSWORD_MISMATCH: 'Passwords do not match.',
  WEAK_PASSWORD:
    'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
  TERMS_NOT_ACCEPTED: 'You must accept the terms and conditions.',
  INVALID_REFRESH_TOKEN: 'Invalid or expired refresh token.',
  CURRENT_PASSWORD_INCORRECT: 'Current password is incorrect.',
  RESEND_RATE_LIMIT: 'Please wait before requesting another verification code.',
  ROLE_NOT_FOUND: 'Default user role not found. Run database seed.',
};

const SUCCESS_MESSAGES = {
  HEALTH_CHECK: 'CoreSY API is running',
  REGISTRATION_SUCCESS: 'Registration successful. Please verify your email.',
  EMAIL_VERIFIED: 'Email verified successfully. You can now log in.',
  VERIFICATION_EMAIL_SENT: 'Verification code sent to your email.',
  LOGIN_SUCCESS: 'Login successful.',
  LOGOUT_SUCCESS: 'Logged out successfully.',
  TOKEN_REFRESHED: 'Token refreshed successfully.',
  PASSWORD_RESET_EMAIL_SENT: 'If the email exists, a reset code has been sent.',
  PASSWORD_RESET_SUCCESS: 'Password reset successfully.',
  PASSWORD_CHANGED: 'Password changed successfully.',
  PROFILE_UPDATED: 'Profile updated successfully.',
};

module.exports = {
  HTTP_STATUS,
  USER_STATUS,
  ROLES,
  SUBSCRIPTION_TIERS,
  REDIS_KEYS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
};
