/**
 * Driver authentication middleware.
 * Validates driver JWT tokens and attaches driver profile to the request.
 */

const { verifyAccessToken } = require('../../../utils/jwt');
const driverRepository = require('../repositories/driver.repository');
const AppError = require('../../../utils/AppError');
const { HTTP_STATUS, ERROR_MESSAGES, DRIVER_STATUS } = require('../../../constants');

const driverAuthenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED));
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    if (decoded.type !== 'driver') {
      return next(new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED));
    }

    const driver = await driverRepository.findById(decoded.sub);
    if (!driver) {
      return next(new AppError(ERROR_MESSAGES.DRIVER_NOT_FOUND, HTTP_STATUS.UNAUTHORIZED));
    }

    if (driver.status === DRIVER_STATUS.SUSPENDED) {
      return next(new AppError(ERROR_MESSAGES.DRIVER_SUSPENDED, HTTP_STATUS.FORBIDDEN));
    }

    req.driver = driver;
    req.user = {
      id: driver.id,
      roles: ['DRIVER'],
      permissions: [],
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = driverAuthenticate;
