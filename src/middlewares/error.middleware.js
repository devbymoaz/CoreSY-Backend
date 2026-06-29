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
 * Handle Prisma-specific errors and convert to AppError.
 * @param {Error} error - Prisma error
 * @returns {AppError}
 */
const handlePrismaError = (error) => {
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'field';
    return new AppError(`${field} already exists`, HTTP_STATUS.CONFLICT);
  }

  if (error.code === 'P2025') {
    return new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  return new AppError(
    ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
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
    // Add the original Prisma message for debugging
    error.originalError = err.message;
  }

  // Convert JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    error = new AppError(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED);
  }

  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  // Show actual error message for debugging in all environments temporarily
  const message = error.isOperational ? error.message : (error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR);

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

  // Include stack trace and original error for debugging
  if (config.env === 'development' || config.env === 'production') {
    response.stack = error.stack;
    response.originalError = error.originalError || null;
  }

  return sendError(res, response);
};

module.exports = errorHandler;
