/**
 * 404 Not Found middleware.
 * Handles requests to undefined routes with a consistent error response.
 */

const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants');
const { sendError } = require('../helpers/response.helper');

/**
 * Catch-all middleware for undefined routes.
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
const notFoundHandler = (req, res) => {
  return sendError(res, {
    message: `${ERROR_MESSAGES.NOT_FOUND}: ${req.method} ${req.originalUrl}`,
    statusCode: HTTP_STATUS.NOT_FOUND,
  });
};

module.exports = notFoundHandler;
