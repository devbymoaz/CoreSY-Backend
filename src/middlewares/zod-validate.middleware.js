/**
 * Zod Validation Middleware
 * Validates request bodies, params, and queries using Zod schemas
 */

const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants');
const AppError = require('../utils/AppError');

/**
 * Validate request using Zod schema
 * @param {Object} options - Options object
 * @param {import('zod').ZodSchema} [options.body] - Zod schema for body
 * @param {import('zod').ZodSchema} [options.params] - Zod schema for params
 * @param {import('zod').ZodSchema} [options.query] - Zod schema for query
 */
const validate = (options) => {
  return (req, _res, next) => {
    try {
      if (options.body) {
        const result = options.body.safeParse(req.body);
        if (!result.success) {
          const errors = result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          }));
          return next(
            new AppError(ERROR_MESSAGES.VALIDATION_ERROR, HTTP_STATUS.UNPROCESSABLE_ENTITY, errors)
          );
        }
        req.body = result.data;
      }

      if (options.params) {
        const result = options.params.safeParse(req.params);
        if (!result.success) {
          const errors = result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          }));
          return next(
            new AppError(ERROR_MESSAGES.VALIDATION_ERROR, HTTP_STATUS.UNPROCESSABLE_ENTITY, errors)
          );
        }
        req.params = result.data;
      }

      if (options.query) {
        const result = options.query.safeParse(req.query);
        if (!result.success) {
          const errors = result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          }));
          return next(
            new AppError(ERROR_MESSAGES.VALIDATION_ERROR, HTTP_STATUS.UNPROCESSABLE_ENTITY, errors)
          );
        }
        req.query = result.data;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = validate;
