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
  SUPER_ADMIN: 'SUPER_ADMIN',
  FINANCE_ADMIN: 'FINANCE_ADMIN',
  SUPPORT_ADMIN: 'SUPPORT_ADMIN',
  BUSINESS_OWNER: 'BUSINESS_OWNER',
  BUSINESS_MANAGER: 'BUSINESS_MANAGER',
  CASHIER: 'CASHIER',
  DRIVER: 'DRIVER',
  USER: 'USER',
};

const ROLE_PRIORITIES = {
  SUPER_ADMIN: 100,
  FINANCE_ADMIN: 90,
  SUPPORT_ADMIN: 80,
  BUSINESS_OWNER: 70,
  BUSINESS_MANAGER: 60,
  CASHIER: 50,
  DRIVER: 40,
  USER: 10,
};

const ROLE_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
};

const PERMISSION_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
};

const BUSINESS_STATUS = {
  PENDING: 'PENDING',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
  INACTIVE: 'INACTIVE',
  ACTIVE: 'ACTIVE',
};

const BUSINESS_TYPE = {
  RESTAURANT: 'RESTAURANT',
  CAFE: 'CAFE',
  BAR: 'BAR',
  MEDICAL_CLINIC: 'MEDICAL_CLINIC',
  HOSPITAL: 'HOSPITAL',
  DENTAL_CLINIC: 'DENTAL_CLINIC',
  PHARMACY: 'PHARMACY',
  BEAUTY_SALON: 'BEAUTY_SALON',
  SPA: 'SPA',
  GYM: 'GYM',
  SPORTS_CLUB: 'SPORTS_CLUB',
  ENTERTAINMENT_CENTER: 'ENTERTAINMENT_CENTER',
  JUICE_SHOP: 'JUICE_SHOP',
  SWEET_SHOP: 'SWEET_SHOP',
  SUPERMARKET: 'SUPERMARKET',
  RETAIL_STORE: 'RETAIL_STORE',
  OTHER: 'OTHER',
};

const PERMISSION_MODULES = {
  USERS: 'Users',
  BUSINESSES: 'Businesses',
  BRANCHES: 'Branches',
  SERVICES: 'Services',
  BOOKINGS: 'Bookings',
  DRIVERS: 'Drivers',
  CASHIERS: 'Cashiers',
  WALLET: 'Wallet',
  PAYMENTS: 'Payments',
  SUBSCRIPTIONS: 'Subscriptions',
  NOTIFICATIONS: 'Notifications',
  REPORTS: 'Reports',
  ANALYTICS: 'Analytics',
  SETTINGS: 'Settings',
  ROLES: 'Roles',
  PERMISSIONS: 'Permissions',
  CONTENT: 'Content',
  SUPPORT: 'Support',
  FINANCE: 'Finance',
  POINTS: 'Points',
  QR: 'QR',
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
  ROLE_NOT_FOUND: 'Role not found.',
  PERMISSION_NOT_FOUND: 'Permission not found.',
  EMAIL_ALREADY_EXISTS: 'A user with this email already exists.',
  PHONE_ALREADY_EXISTS: 'A user with this phone number already exists.',
  ROLE_NAME_EXISTS: 'A role with this name already exists.',
  PERMISSION_SLUG_EXISTS: 'A permission with this slug already exists.',
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
  CANNOT_DELETE_SYSTEM_ROLE: 'System roles cannot be deleted.',
  CANNOT_MODIFY_SYSTEM_ROLE: 'System roles cannot be modified.',
  BUSINESS_NOT_FOUND: 'Business not found.',
  BUSINESS_EMAIL_ALREADY_EXISTS: 'A business with this email already exists.',
  REGISTRATION_NUMBER_ALREADY_EXISTS: 'A business with this registration number already exists.',
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
  ROLE_CREATED: 'Role created successfully.',
  ROLE_UPDATED: 'Role updated successfully.',
  ROLE_DELETED: 'Role deleted successfully.',
  ROLE_STATUS_UPDATED: 'Role status updated successfully.',
  PERMISSION_CREATED: 'Permission created successfully.',
  PERMISSION_UPDATED: 'Permission updated successfully.',
  PERMISSION_DELETED: 'Permission deleted successfully.',
  PERMISSIONS_ASSIGNED: 'Permissions assigned successfully.',
  ROLES_ASSIGNED: 'Roles assigned successfully.',
  ADMIN_CREATED: 'Admin created successfully.',
  ADMIN_UPDATED: 'Admin updated successfully.',
  ADMIN_DELETED: 'Admin deleted successfully.',
  ADMIN_STATUS_UPDATED: 'Admin status updated successfully.',
  ADMIN_PASSWORD_RESET: 'Admin password reset successfully.',
  PROFILE_IMAGE_UPLOADED: 'Profile image uploaded successfully.',
  BUSINESS_CREATED: 'Business registered successfully.',
  BUSINESS_UPDATED: 'Business updated successfully.',
  BUSINESS_DELETED: 'Business deleted successfully.',
  BUSINESS_STATUS_UPDATED: 'Business status updated successfully.',
  BUSINESS_APPROVED: 'Business approved successfully.',
  BUSINESS_REJECTED: 'Business rejected successfully.',
  BUSINESS_LOGO_UPLOADED: 'Business logo uploaded successfully.',
  BUSINESS_COVER_UPLOADED: 'Business cover image uploaded successfully.',
};

const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

module.exports = {
  HTTP_STATUS,
  USER_STATUS,
  ROLES,
  ROLE_PRIORITIES,
  ROLE_STATUS,
  PERMISSION_STATUS,
  BUSINESS_STATUS,
  BUSINESS_TYPE,
  PERMISSION_MODULES,
  SUBSCRIPTION_TIERS,
  REDIS_KEYS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  PAGINATION,
};
