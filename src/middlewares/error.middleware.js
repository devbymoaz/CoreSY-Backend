/**
 * Centralized error handling middleware.
 * Catches all errors and returns consistent JSON error responses.
 */

const config = require('../config');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants');
const { sendError } = require('../helpers/response.helper');

/**
 * Handle Prisma-specific errors and convert to AppError with detailed messages.
 * @param {Error} error - Prisma error
 * @returns {AppError}
 */
const handlePrismaError = (error) => {
  // Unique constraint violation
  if (error.code === 'P2002') {
    const field = error.meta?.target?.join(', ') || 'field';
    return new AppError(`${field} already exists`, HTTP_STATUS.CONFLICT);
  }

  // Record not found
  if (error.code === 'P2025') {
    return new AppError(error.message || ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  // Foreign key constraint failed
  if (error.code === 'P2003') {
    const field = error.meta?.field_name || 'related record';
    return new AppError(`${field} not found or invalid`, HTTP_STATUS.BAD_REQUEST);
  }

  // Invalid value for field
  if (error.code === 'P2005') {
    const field = error.meta?.field_name || 'field';
    const value = error.meta?.value || 'value';
    return new AppError(`Invalid value "${value}" for field ${field}`, HTTP_STATUS.BAD_REQUEST);
  }

  // Missing required value
  if (error.code === 'P2007') {
    return new AppError(error.message || 'Invalid data provided', HTTP_STATUS.BAD_REQUEST);
  }

  // Default: show the actual Prisma error message for debugging
  return new AppError(
    error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    false,
  );
};

/**
 * Global error handler middleware.
 * @param {Error} err - Error object
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next function
 */
const errorHandler = (err, req, res, _next) => {
  let error = err;

  // Log the original error for debugging
  logger.error('Full error details:', err);

  // Convert Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    error = handlePrismaError(error);
  }

  // Convert Zod errors (if any)
  if (error.name === 'ZodError') {
    const errors = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    const errorMessages = errors.map((e) => `${e.field}: ${e.message}`).join(', ');
    error = new AppError(
      `${ERROR_MESSAGES.VALIDATION_ERROR}: ${errorMessages}`,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      true,
      errors,
    );
  }

  // Convert JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    let message;
    if (error.name === 'TokenExpiredError') {
      message = 'Token expired';
    } else {
      message = 'Invalid token';
    }
    error = new AppError(message, HTTP_STATUS.UNAUTHORIZED);
  }

  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  // Always show actual error message for debugging
  const message = error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

  // Log error details
  if (!error.isOperational || statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} - ${error.message}`, {
      stack: error.stack,
      statusCode,
    });
  }

  const response = {
    success: false,
    message,
    statusCode,
    errors: error.errors || null,
  };

  // Include stack trace and original error for debugging in all environments
  if (config.env === 'development' || config.env === 'production') {
    response.stack = error.stack;
  }

  return sendError(res, response);
};

module.exports = errorHandler;
