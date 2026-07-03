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

const BRANCH_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  CLOSED: 'CLOSED',
};

const SERVICE_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  ARCHIVED: 'ARCHIVED',
};

const SERVICE_TYPE = {
  RESTAURANT: 'RESTAURANT',
  CAFE: 'CAFE',
  BAR: 'BAR',
  MEDICAL_CONSULTATION: 'MEDICAL_CONSULTATION',
  DENTAL_CONSULTATION: 'DENTAL_CONSULTATION',
  LABORATORY: 'LABORATORY',
  PHARMACY: 'PHARMACY',
  BEAUTY_SERVICE: 'BEAUTY_SERVICE',
  SPA_TREATMENT: 'SPA_TREATMENT',
  GYM_MEMBERSHIP: 'GYM_MEMBERSHIP',
  SPORTS_ACTIVITY: 'SPORTS_ACTIVITY',
  ENTERTAINMENT_ACTIVITY: 'ENTERTAINMENT_ACTIVITY',
  DELIVERY_PRODUCT: 'DELIVERY_PRODUCT',
  RETAIL_PRODUCT: 'RETAIL_PRODUCT',
  OTHER: 'OTHER',
};

const SERVICE_CATEGORY = {
  FOOD_AND_DRINKS: 'FOOD_AND_DRINKS',
  MEDICAL: 'MEDICAL',
  HEALTHCARE: 'HEALTHCARE',
  BEAUTY: 'BEAUTY',
  FITNESS: 'FITNESS',
  SPORTS: 'SPORTS',
  ENTERTAINMENT: 'ENTERTAINMENT',
  RETAIL: 'RETAIL',
  DELIVERY: 'DELIVERY',
  OTHER: 'OTHER',
};

const CASHIER_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  RESIGNED: 'RESIGNED',
  DELETED: 'DELETED',
};

const SLOT_STATUS = {
  AVAILABLE: 'AVAILABLE',
  FULL: 'FULL',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
  INACTIVE: 'INACTIVE',
};

const BOOKING_TYPE = {
  RESERVATION: 'RESERVATION',
  APPOINTMENT: 'APPOINTMENT',
  WALK_IN: 'WALK_IN',
};

const RECURRING_TYPE = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  NONE: 'NONE',
};

const GENDER_RESTRICTION = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  BOTH: 'BOTH',
};

const BOOKING_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  REJECTED: 'REJECTED',
  NO_SHOW: 'NO_SHOW',
};

const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  CASH: 'CASH',
  WALLET: 'WALLET',
};

const BOOKING_SOURCE = {
  MOBILE_APP: 'MOBILE_APP',
  WEB: 'WEB',
  WALK_IN: 'WALK_IN',
  ADMIN: 'ADMIN',
};

const QR_STATUS = {
  GENERATED: 'GENERATED',
  ACTIVE: 'ACTIVE',
  SCANNED: 'SCANNED',
  COMPLETED: 'COMPLETED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  INVALID: 'INVALID',
};

const PRODUCT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  HIDDEN: 'HIDDEN',
  DELETED: 'DELETED',
};

const PRODUCT_UNIT = {
  PIECE: 'PIECE',
  KG: 'KG',
  GRAM: 'GRAM',
  LITER: 'LITER',
  ML: 'ML',
  PACK: 'PACK',
  BOX: 'BOX',
  BOTTLE: 'BOTTLE',
  PORTION: 'PORTION',
  OTHER: 'OTHER',
};

const ORDER_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  ASSIGNED: 'ASSIGNED',
  PICKED_UP: 'PICKED_UP',
  ON_THE_WAY: 'ON_THE_WAY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
  REFUNDED: 'REFUNDED',
};

const ORDER_PAYMENT_METHOD = {
  CASH: 'CASH',
  WALLET: 'WALLET',
  CARD: 'CARD',
  ONLINE: 'ONLINE',
};

const VEHICLE_TYPE = {
  MOTORCYCLE: 'MOTORCYCLE',
  CAR: 'CAR',
  BICYCLE: 'BICYCLE',
  VAN: 'VAN',
};

const DRIVER_STATUS = {
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  REJECTED: 'REJECTED',
};

const DRIVER_AVAILABILITY_STATUS = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  BUSY: 'BUSY',
  ON_DELIVERY: 'ON_DELIVERY',
};

const DRIVER_GENDER = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
};

const PAYMENT_METHOD_TYPE = {
  CASH: 'CASH',
  WALLET: 'WALLET',
  CREDIT_CARD: 'CREDIT_CARD',
  DEBIT_CARD: 'DEBIT_CARD',
  APPLE_PAY: 'APPLE_PAY',
  GOOGLE_PAY: 'GOOGLE_PAY',
  STRIPE: 'STRIPE',
  PAYPAL: 'PAYPAL',
};

const PAYMENT_RECORD_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCESSFUL: 'SUCCESSFUL',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
};

const PAYMENT_TYPE = {
  BOOKING: 'BOOKING',
  ORDER: 'ORDER',
  TOP_UP: 'TOP_UP',
  OTHER: 'OTHER',
};

const WALLET_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  CLOSED: 'CLOSED',
};

const WALLET_TRANSACTION_TYPE = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
  REFUND: 'REFUND',
  TOP_UP: 'TOP_UP',
  CASHBACK: 'CASHBACK',
  REWARD_CREDIT: 'REWARD_CREDIT',
  REWARD_REDEMPTION: 'REWARD_REDEMPTION',
  ADMIN_ADJUSTMENT: 'ADMIN_ADJUSTMENT',
  PLATFORM_REFUND: 'PLATFORM_REFUND',
};

const WALLET_TRANSACTION_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
};

const PERMISSION_MODULES = {
  USERS: 'Users',
  BUSINESSES: 'Businesses',
  BRANCHES: 'Branches',
  SERVICES: 'Services',
  PRODUCTS: 'Products',
  ORDERS: 'Orders',
  SLOTS: 'Slots',
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
  BRANCH_NOT_FOUND: 'Branch not found.',
  BRANCH_NAME_ALREADY_EXISTS: 'A branch with this name already exists for this business.',
  BRANCH_CODE_ALREADY_EXISTS: 'A branch with this code already exists.',
  SERVICE_NOT_FOUND: 'Service not found.',
  SERVICE_NAME_ALREADY_EXISTS: 'A service with this name already exists for this branch.',
  SERVICE_CODE_ALREADY_EXISTS: 'A service with this code already exists.',
  CASHIER_NOT_FOUND: 'Cashier not found.',
  CASHIER_EMAIL_ALREADY_EXISTS: 'A cashier with this email already exists.',
  CASHIER_PHONE_ALREADY_EXISTS: 'A cashier with this phone number already exists.',
  CASHIER_EMPLOYEE_ID_ALREADY_EXISTS: 'A cashier with this employee ID already exists.',
  SLOT_NOT_FOUND: 'Slot not found.',
  SLOT_OVERLAP: 'Slot overlaps with an existing slot.',
  BOOKING_NOT_FOUND: 'Booking not found.',
  BOOKING_NUMBER_EXISTS: 'Booking number already exists.',
  SLOT_NOT_AVAILABLE: 'This slot is not available for booking.',
  SLOT_FULL: 'This slot is fully booked.',
  DUPLICATE_BOOKING: 'You have already booked this slot.',
  INVALID_BOOKING_STATUS: 'Invalid booking status.',
  INVALID_PAYMENT_STATUS: 'Invalid payment status.',
  INSUFFICIENT_CAPACITY: 'Insufficient capacity in the slot.',
  BOOKING_CANNOT_BE_CANCELLED: 'This booking cannot be cancelled.',
  BOOKING_CANNOT_BE_UPDATED: 'This booking cannot be updated.',
  QR_NOT_FOUND: 'QR code not found.',
  QR_ALREADY_EXISTS: 'QR code already exists for this booking.',
  QR_INVALID: 'Invalid QR code.',
  QR_EXPIRED: 'QR code has expired.',
  QR_CANCELLED: 'QR code has been cancelled.',
  QR_ALREADY_SCANNED: 'QR code has already been scanned.',
  QR_NOT_ACTIVE: 'QR code is not active.',
  INVALID_QR_TOKEN: 'Invalid QR token.',
  PRODUCT_NOT_FOUND: 'Product not found.',
  PRODUCT_SKU_ALREADY_EXISTS: 'A product with this SKU already exists for this business.',
  PRODUCT_CODE_ALREADY_EXISTS: 'A product with this code already exists.',
  PRODUCT_CATEGORY_NOT_FOUND: 'Product category not found.',
  PRODUCT_CATEGORY_SLUG_EXISTS: 'A product category with this slug already exists.',
  PRODUCT_INVALID_PRICE: 'Product prices must be positive numbers.',
  PRODUCT_INVALID_STOCK: 'Stock quantity must be a non-negative number.',
  PRODUCT_INVALID_IMAGE: 'Invalid product image URL.',
  PRODUCT_INVALID_STATUS: 'Invalid product status.',
  PRODUCT_READ_ONLY: 'You have read-only access to products.',
  ORDER_NOT_FOUND: 'Order not found.',
  BUSINESS_ORDER_NOT_FOUND: 'Business order not found.',
  ORDER_CANNOT_BE_CANCELLED: 'This order cannot be cancelled.',
  ORDER_CANNOT_BE_UPDATED: 'This order cannot be updated.',
  ORDER_INVALID_STATUS_TRANSITION: 'Invalid order status transition.',
  ORDER_EMPTY_ITEMS: 'Order must contain at least one item.',
  ORDER_PRODUCT_INACTIVE: 'One or more products are not active.',
  ORDER_INSUFFICIENT_STOCK: 'Insufficient stock for one or more products.',
  ORDER_ALREADY_CANCELLED: 'Order is already cancelled.',
  DRIVER_NOT_FOUND: 'Driver not found.',
  DRIVER_EMAIL_ALREADY_EXISTS: 'A driver with this email already exists.',
  DRIVER_PHONE_ALREADY_EXISTS: 'A driver with this phone number already exists.',
  DRIVER_NATIONAL_ID_EXISTS: 'A driver with this national ID already exists.',
  DRIVER_LICENSE_EXISTS: 'A driver with this driving license already exists.',
  DRIVER_VEHICLE_REGISTRATION_EXISTS:
    'A driver with this vehicle registration number already exists.',
  DRIVER_VEHICLE_PLATE_EXISTS: 'A driver with this vehicle plate number already exists.',
  DRIVER_INVALID_CREDENTIALS: 'Invalid email/phone or password.',
  DRIVER_NOT_ACTIVE: 'Driver account is not active.',
  DRIVER_PENDING_VERIFICATION: 'Driver account is pending verification.',
  DRIVER_SUSPENDED: 'Driver account has been suspended.',
  DRIVER_REJECTED: 'Driver account has been rejected.',
  DRIVER_DOCUMENTS_REQUIRED: 'Required driver documents are missing.',
  PAYMENT_NOT_FOUND: 'Payment not found.',
  PAYMENT_ALREADY_EXISTS: 'A successful payment already exists for this booking or order.',
  PAYMENT_CANNOT_BE_CANCELLED: 'This payment cannot be cancelled.',
  PAYMENT_CANNOT_BE_REFUNDED: 'This payment cannot be refunded.',
  PAYMENT_INVALID_AMOUNT: 'Payment amount must be greater than zero.',
  PAYMENT_INVALID_REFUND_AMOUNT: 'Refund amount is invalid.',
  WALLET_NOT_FOUND: 'Wallet not found.',
  WALLET_NOT_ACTIVE: 'Wallet is not active.',
  WALLET_INSUFFICIENT_BALANCE: 'Insufficient wallet balance.',
  WALLET_INVALID_AMOUNT: 'Wallet amount must be greater than zero.',
  WALLET_TRANSFER_SAME: 'Cannot transfer to the same wallet.',
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
  BRANCH_CREATED: 'Branch created successfully.',
  BRANCH_UPDATED: 'Branch updated successfully.',
  BRANCH_DELETED: 'Branch deleted successfully.',
  BRANCH_STATUS_UPDATED: 'Branch status updated successfully.',
  BRANCH_MAIN_UPDATED: 'Main branch updated successfully.',
  BRANCH_IMAGE_UPLOADED: 'Branch image uploaded successfully.',
  BRANCH_COVER_UPLOADED: 'Branch cover image uploaded successfully.',
  SERVICE_CREATED: 'Service created successfully.',
  SERVICE_UPDATED: 'Service updated successfully.',
  SERVICE_DELETED: 'Service deleted successfully.',
  SERVICE_STATUS_UPDATED: 'Service status updated successfully.',
  SERVICE_FEATURED_UPDATED: 'Service featured status updated successfully.',
  SERVICE_IMAGE_UPLOADED: 'Service image uploaded successfully.',
  SERVICE_GALLERY_UPLOADED: 'Service gallery uploaded successfully.',
  CASHIER_CREATED: 'Cashier created successfully.',
  CASHIER_UPDATED: 'Cashier updated successfully.',
  CASHIER_DELETED: 'Cashier deleted successfully.',
  CASHIER_STATUS_UPDATED: 'Cashier status updated successfully.',
  CASHIER_PASSWORD_RESET: 'Cashier password reset successfully.',
  CASHIER_PROFILE_IMAGE_UPLOADED: 'Cashier profile image uploaded successfully.',
  SLOT_CREATED: 'Slot created successfully.',
  SLOT_UPDATED: 'Slot updated successfully.',
  SLOT_DELETED: 'Slot deleted successfully.',
  SLOT_STATUS_UPDATED: 'Slot status updated successfully.',
  SLOT_RECURRING_CREATED: 'Recurring slots created successfully.',
  SLOT_DUPLICATED: 'Slot duplicated successfully.',
  BOOKING_CREATED: 'Booking created successfully.',
  BOOKING_UPDATED: 'Booking updated successfully.',
  BOOKING_DELETED: 'Booking deleted successfully.',
  BOOKING_CONFIRMED: 'Booking confirmed successfully.',
  BOOKING_REJECTED: 'Booking rejected successfully.',
  BOOKING_CANCELLED: 'Booking cancelled successfully.',
  BOOKING_RESCHEDULED: 'Booking rescheduled successfully.',
  BOOKING_CHECKED_IN: 'Check-in successful.',
  BOOKING_CHECKED_OUT: 'Check-out successful.',
  QR_CODE_GENERATED: 'QR code generated successfully.',
  FAVORITE_ADDED: 'Business added to favorites.',
  FAVORITE_REMOVED: 'Business removed from favorites.',
  QR_VALIDATED: 'QR code validated successfully.',
  QR_SCANNED: 'QR code scanned successfully.',
  QR_CHECKED_IN: 'Customer checked in successfully.',
  QR_CHECKED_OUT: 'Customer checked out successfully.',
  QR_CANCELLED: 'QR code cancelled successfully.',
  QR_EXPIRED: 'QR code marked as expired.',
  QR_DOWNLOADED: 'QR code downloaded successfully.',
  PRODUCT_CREATED: 'Product created successfully.',
  PRODUCT_UPDATED: 'Product updated successfully.',
  PRODUCT_DELETED: 'Product deleted successfully.',
  PRODUCT_STATUS_UPDATED: 'Product status updated successfully.',
  PRODUCT_STOCK_UPDATED: 'Product stock updated successfully.',
  PRODUCT_DUPLICATED: 'Product duplicated successfully.',
  PRODUCT_IMAGES_UPDATED: 'Product images updated successfully.',
  PRODUCT_IMAGES_REMOVED: 'Product images removed successfully.',
  PRODUCT_BULK_UPDATED: 'Products updated successfully.',
  PRODUCT_IMPORTED: 'Products imported successfully.',
  PRODUCT_EXPORTED: 'Products exported successfully.',
  PRODUCT_CATEGORY_CREATED: 'Product category created successfully.',
  PRODUCT_CATEGORY_UPDATED: 'Product category updated successfully.',
  PRODUCT_CATEGORY_DELETED: 'Product category deleted successfully.',
  ORDER_CREATED: 'Order created successfully.',
  ORDER_UPDATED: 'Order updated successfully.',
  ORDER_CANCELLED: 'Order cancelled successfully.',
  ORDER_REORDERED: 'Order recreated successfully.',
  ORDER_ACCEPTED: 'Order accepted successfully.',
  ORDER_REJECTED: 'Order rejected successfully.',
  ORDER_PREPARING: 'Order marked as preparing.',
  ORDER_READY: 'Order marked as ready.',
  ORDER_STATUS_UPDATED: 'Order status updated successfully.',
  ORDER_INVOICE_GENERATED: 'Invoice generated successfully.',
  DRIVER_REGISTERED: 'Driver registered successfully. Pending verification.',
  DRIVER_LOGIN_SUCCESS: 'Driver login successful.',
  DRIVER_PROFILE_UPDATED: 'Driver profile updated successfully.',
  DRIVER_DOCUMENTS_UPLOADED: 'Driver documents uploaded successfully.',
  DRIVER_VEHICLE_UPLOADED: 'Vehicle images uploaded successfully.',
  DRIVER_STATUS_UPDATED: 'Driver status updated successfully.',
  DRIVER_APPROVED: 'Driver approved successfully.',
  DRIVER_REJECTED: 'Driver rejected successfully.',
  DRIVER_SUSPENDED: 'Driver suspended successfully.',
  DRIVER_ACTIVATED: 'Driver activated successfully.',
  DRIVER_DELETED: 'Driver deleted successfully.',
  DRIVER_AVAILABILITY_UPDATED: 'Driver availability updated successfully.',
  DRIVER_LOCATION_UPDATED: 'Driver location updated successfully.',
  PAYMENT_CREATED: 'Payment created successfully.',
  PAYMENT_VERIFIED: 'Payment verified successfully.',
  PAYMENT_CANCELLED: 'Payment cancelled successfully.',
  PAYMENT_REFUNDED: 'Payment refunded successfully.',
  PAYMENT_FAILED: 'Payment failed.',
  WALLET_CREATED: 'Wallet created successfully.',
  WALLET_TOPPED_UP: 'Wallet topped up successfully.',
  WALLET_WITHDRAWN: 'Wallet withdrawal completed successfully.',
  WALLET_TRANSFERRED: 'Wallet transfer completed successfully.',
  WALLET_FROZEN: 'Wallet frozen successfully.',
  WALLET_UNFROZEN: 'Wallet unfrozen successfully.',
  WALLET_ADJUSTED: 'Wallet balance adjusted successfully.',
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
  BRANCH_STATUS,
  SERVICE_STATUS,
  SERVICE_TYPE,
  SERVICE_CATEGORY,
  CASHIER_STATUS,
  SLOT_STATUS,
  BOOKING_TYPE,
  RECURRING_TYPE,
  GENDER_RESTRICTION,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  BOOKING_SOURCE,
  QR_STATUS,
  PRODUCT_STATUS,
  PRODUCT_UNIT,
  ORDER_STATUS,
  ORDER_PAYMENT_METHOD,
  VEHICLE_TYPE,
  DRIVER_STATUS,
  DRIVER_AVAILABILITY_STATUS,
  DRIVER_GENDER,
  PAYMENT_METHOD_TYPE,
  PAYMENT_RECORD_STATUS,
  PAYMENT_TYPE,
  WALLET_STATUS,
  WALLET_TRANSACTION_TYPE,
  WALLET_TRANSACTION_STATUS,
  PERMISSION_MODULES,
  SUBSCRIPTION_TIERS,
  REDIS_KEYS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  PAGINATION,
};
