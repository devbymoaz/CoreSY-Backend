/**
 * User domain model.
 * Defines the User entity shape and transformation methods for API responses.
 */

/**
 * Transform a Prisma User record to a safe API response (excludes password).
 * @param {Object} user - Prisma user record with relations
 * @returns {Object|null} Sanitized user object
 */
const toUserResponse = (user) => {
  if (!user) return null;

  const assignedRoles =
    user.userRoles
      ?.map((userRole) => userRole.role)
      .filter(Boolean)
      .map((role) => ({ id: role.id, name: role.name })) || [];

  if (user.role && !assignedRoles.some((role) => role.id === user.role.id)) {
    assignedRoles.push({
      id: user.role.id,
      name: user.role.name,
    });
  }

  return {
    id: user.id,
    passId: user.passId,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    smartAssistantName: user.smartAssistantName,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    status: user.status,
    subscription: user.subscription,
    governorate: user.governorate
      ? {
          id: user.governorate.id,
          name: user.governorate.name,
          nameAr: user.governorate.nameAr,
          code: user.governorate.code,
        }
      : null,
    role: user.role
      ? {
          id: user.role.id,
          name: user.role.name,
        }
      : null,
    roles: assignedRoles,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

/**
 * Transform user to a minimal public profile.
 * @param {Object} user - Prisma user record
 * @returns {Object|null}
 */
const toProfileResponse = (user) => {
  return toUserResponse(user);
};

/**
 * Transform auth tokens response.
 * @param {Object} tokens - Access and refresh tokens
 * @param {Object} user - User record
 * @returns {Object}
 */
const toAuthResponse = (tokens, user) => {
  return {
    ...tokens,
    user: toUserResponse(user),
  };
};

module.exports = {
  toUserResponse,
  toProfileResponse,
  toAuthResponse,
};
