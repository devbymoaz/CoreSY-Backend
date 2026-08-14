/**
 * Global API response helper.
 * Standardizes success and error response formats across all endpoints.
 */

const { HTTP_STATUS } = require('../constants');

const RESPONSE_META_KEYS = new Set(['message', 'statusCode', 'meta', 'data', 'success', 'errors']);

/**
 * Normalize service/controller payloads into { message, data, meta, statusCode }.
 * Supports both:
 * - { message, data: entity }
 * - { message, business } / { message, product } / etc.
 * - { businesses, total, page } list payloads
 */
const normalizeSuccessOptions = (options = {}) => {
  if (options === null || options === undefined) {
    return {
      message: 'Success',
      data: null,
      meta: null,
      statusCode: HTTP_STATUS.OK,
    };
  }

  if (typeof options !== 'object' || Array.isArray(options)) {
    return {
      message: 'Success',
      data: options,
      meta: null,
      statusCode: HTTP_STATUS.OK,
    };
  }

  const {
    message = 'Success',
    statusCode = HTTP_STATUS.OK,
    meta = null,
    data,
    ...rest
  } = options;

  let responseData = data !== undefined ? data : null;

  if (responseData === null) {
    const payloadKeys = Object.keys(rest).filter((key) => !RESPONSE_META_KEYS.has(key));

    if (payloadKeys.length === 1) {
      // { message, business } -> data: business
      responseData = rest[payloadKeys[0]];
    } else if (payloadKeys.length > 1) {
      // { businesses, total, page } -> data: { businesses, total, page }
      responseData = {};
      for (const key of payloadKeys) {
        responseData[key] = rest[key];
      }
    }
  }

  return {
    message,
    data: responseData,
    meta,
    statusCode,
  };
};

/**
 * Send a standardized success response.
 * @param {import('express').Response} res - Express response object
 * @param {Object} options - Response options
 * @param {*} [options.data] - Response payload
 * @param {string} [options.message] - Success message
 * @param {number} [options.statusCode] - HTTP status code
 * @param {Object} [options.meta] - Additional metadata (pagination, etc.)
 */
const sendSuccess = (res, options = {}) => {
  const { data, message, statusCode, meta } = normalizeSuccessOptions(options);

  const response = {
    success: true,
    message,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send a standardized error response.
 * @param {import('express').Response} res - Express response object
 * @param {Object} options - Error options
 * @param {string} options.message - Error message
 * @param {number} [options.statusCode] - HTTP status code
 * @param {Array|Object} [options.errors] - Validation or field errors
 */
const sendError = (
  res,
  { message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errors = null },
) => {
  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send a created (201) response.
 * @param {import('express').Response} res - Express response object
 * @param {Object} options - Response options
 */
const sendCreated = (res, options) => {
  return sendSuccess(res, { ...options, statusCode: HTTP_STATUS.CREATED });
};

/**
 * Send a no content (204) response.
 * @param {import('express').Response} res - Express response object
 */
const sendNoContent = (res) => {
  return res.status(HTTP_STATUS.NO_CONTENT).send();
};

module.exports = {
  sendSuccess,
  sendError,
  sendCreated,
  sendNoContent,
  normalizeSuccessOptions,
};
