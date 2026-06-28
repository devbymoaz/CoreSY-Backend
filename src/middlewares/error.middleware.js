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

  // Convert Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    error = handlePrismaError(error);
  }

  // Convert JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    error = new AppError(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED);
  }

  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = error.isOperational ? error.message : ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

  // Log error details
  if (!error.isOperational || statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} - ${error.message}`, {
      stack: error.stack,
      statusCode,
    });
  }

  const response = {
    message,
    statusCode,
    errors: error.errors || null,
  };

  // Include stack trace in development
  if (config.env === 'development' && !error.isOperational) {
    response.stack = error.stack;
  }

  return sendError(res, response);
};

module.exports = errorHandler;
