/**
 * CORS origin matcher.
 * Supports exact origins plus localhost / 127.0.0.1 with any port.
 */

const matchesOriginPattern = (origin, pattern) => {
  if (!pattern || !origin) {
    return false;
  }

  const normalizedPattern = pattern.trim();

  if (normalizedPattern === '*') {
    return true;
  }

  if (origin === normalizedPattern) {
    return true;
  }

  // http://localhost: or http://127.0.0.1: -> any port on that host
  if (normalizedPattern.endsWith(':')) {
    const prefix = normalizedPattern.slice(0, -1);
    return origin === prefix || origin.startsWith(`${prefix}:`);
  }

  if (normalizedPattern === 'http://localhost') {
    return /^http:\/\/localhost(:\d+)?$/.test(origin);
  }

  if (normalizedPattern === 'http://127.0.0.1') {
    return /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);
  }

  return false;
};

const createCorsOriginValidator = (allowedOrigins = []) => {
  const patterns = allowedOrigins.filter(Boolean);

  return (origin, callback) => {
    // Allow non-browser clients and same-origin requests
    if (!origin) {
      callback(null, true);
      return;
    }

    const isAllowed = patterns.some((pattern) => matchesOriginPattern(origin, pattern));

    if (isAllowed) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  };
};

module.exports = {
  matchesOriginPattern,
  createCorsOriginValidator,
};
