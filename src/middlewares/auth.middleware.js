/**
 * JWT authentication middleware.
 * Validates Bearer tokens, loads user from database, and attaches to request.
 */

const { verifyAccessToken } = require('../utils/jwt');
const userRepository = require('../repositories/user.repository');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  USER_STATUS,
  ROLE_STATUS,
  PERMISSION_STATUS,
} = require('../constants');
const AppError = require('../utils/AppError');

/**
 * Authenticate requests using JWT Bearer token.
 * Loads full user record with roles and permissions and attaches to req.user.
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next function
 */
const authenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED));
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await userRepository.findById(decoded.sub);
    if (!user) {
      return next(new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.UNAUTHORIZED));
    }

    if (user.status === USER_STATUS.SUSPENDED) {
      return next(new AppError(ERROR_MESSAGES.ACCOUNT_SUSPENDED, HTTP_STATUS.FORBIDDEN));
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      return next(new AppError(ERROR_MESSAGES.ACCOUNT_NOT_ACTIVE, HTTP_STATUS.FORBIDDEN));
    }

    // Extract roles and permissions
    const userRoles = [];
    const userPermissions = new Set();

    // If user has userRoles (many-to-many), use those, else fall back to single role
    if (user.userRoles && user.userRoles.length > 0) {
      user.userRoles.forEach((userRole) => {
        const role = userRole.role;
        if (role && role.status === ROLE_STATUS.ACTIVE && !role.deletedAt) {
          userRoles.push(role.name);

          if (role.rolePermissions) {
            role.rolePermissions.forEach((rp) => {
              const permission = rp.permission;
              if (
                permission &&
                permission.status === PERMISSION_STATUS.ACTIVE &&
                !permission.deletedAt
              ) {
                userPermissions.add(permission.slug);
              }
            });
          }
        }
      });
    } else if (user.role) {
      // Fallback to single role
      userRoles.push(user.role.name);
    }

    // Attach enhanced user object
    req.user = {
      ...user,
      roles: userRoles,
      permissions: Array.from(userPermissions),
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = authenticate;
