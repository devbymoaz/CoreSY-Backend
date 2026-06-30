/**
 * RBAC Middleware
 * Handles role and permission checks
 */

const AppError = require('../../../utils/AppError');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../../../constants');

/**
 * Check if user has at least one of the specified roles
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user || !req.user.roles) {
      return next(new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED));
    }

    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
    if (!hasRole) {
      return next(new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN));
    }

    next();
  };
};

/**
 * Check if user has the specified permission
 */
const checkPermission = (permissionSlug) => {
  return (req, _res, next) => {
    if (!req.user || !req.user.permissions) {
      return next(new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED));
    }

    if (!req.user.permissions.includes(permissionSlug)) {
      return next(new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN));
    }

    next();
  };
};

/**
 * Check if user has at least one of the specified permissions
 */
const checkAnyPermission = (...permissionSlugs) => {
  return (req, _res, next) => {
    if (!req.user || !req.user.permissions) {
      return next(new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED));
    }

    const hasPermission = permissionSlugs.some(slug =>
      req.user.permissions.includes(slug)
    );
    if (!hasPermission) {
      return next(new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN));
    }

    next();
  };
};

/**
 * Check if user has all of the specified permissions
 */
const checkAllPermissions = (...permissionSlugs) => {
  return (req, _res, next) => {
    if (!req.user || !req.user.permissions) {
      return next(new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED));
    }

    const hasAllPermissions = permissionSlugs.every(slug =>
      req.user.permissions.includes(slug)
    );
    if (!hasAllPermissions) {
      return next(new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN));
    }

    next();
  };
};

module.exports = {
  authorizeRoles,
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
};
