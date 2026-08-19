/**
 * Cashier authentication middleware.
 * Validates cashier JWT tokens and attaches cashier profile to the request.
 */

const { verifyAccessToken } = require('../../../utils/jwt');
const cashierRepository = require('../repositories/cashier.repository');
const AppError = require('../../../utils/AppError');
const { HTTP_STATUS, ERROR_MESSAGES, CASHIER_STATUS, ROLES } = require('../../../constants');

const cashierAuthenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED));
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    if (decoded.type !== 'cashier') {
      return next(new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED));
    }

    const cashier = await cashierRepository.findById(decoded.sub);
    if (!cashier) {
      return next(new AppError(ERROR_MESSAGES.CASHIER_NOT_FOUND, HTTP_STATUS.UNAUTHORIZED));
    }

    if (cashier.status === CASHIER_STATUS.SUSPENDED) {
      return next(new AppError(ERROR_MESSAGES.CASHIER_SUSPENDED, HTTP_STATUS.FORBIDDEN));
    }

    if (cashier.status !== CASHIER_STATUS.ACTIVE && cashier.status !== CASHIER_STATUS.PENDING) {
      return next(new AppError(ERROR_MESSAGES.CASHIER_NOT_ACTIVE, HTTP_STATUS.FORBIDDEN));
    }

    req.cashier = cashier;
    req.user = {
      id: cashier.id,
      roles: [ROLES.CASHIER],
      permissions: [],
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = cashierAuthenticate;
