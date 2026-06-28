/**
 * Async handler wrapper utility.
 * Eliminates try/catch boilerplate in async route handlers and controllers.
 */

/**
 * Wraps an async function to forward errors to Express error middleware.
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
