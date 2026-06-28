/**
 * Request validation middleware factory.
 * Validates request body, params, or query against a schema.
 */

const AppError = require('../utils/AppError');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants');

/**
 * Create a validation middleware from a validator function.
 * @param {Function} validator - Validator function that returns { error, value }
 * @param {string} source - Request property to validate ('body', 'params', 'query')
 * @returns {Function} Express middleware
 */
const validate = (validator, source = 'body') => {
  return (req, _res, next) => {
    const { error, value } = validator(req[source]);

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      const validationError = new AppError(
        ERROR_MESSAGES.VALIDATION_ERROR,
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
      );
      validationError.errors = errors;
      return next(validationError);
    }

    req[source] = value;
    return next();
  };
};

module.exports = validate;
