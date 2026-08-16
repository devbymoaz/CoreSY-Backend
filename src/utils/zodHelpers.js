const { z } = require('zod');

/**
 * Coerce common query/body boolean representations for Zod 4.
 * Accepts true/false, "true"/"false", and treats empty as undefined.
 */
const toOptionalBoolean = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  return value;
};

/** Optional boolean for query params (missing key => undefined). */
const optionalBooleanQuery = () => z.preprocess(toOptionalBoolean, z.boolean().optional());

/**
 * Boolean for request bodies with optional default.
 * Missing/empty values use the provided default.
 */
const booleanBody = (defaultValue = false) =>
  z.preprocess((value) => {
    const coerced = toOptionalBoolean(value);
    return coerced === undefined ? defaultValue : coerced;
  }, z.boolean());

module.exports = {
  optionalBooleanQuery,
  booleanBody,
  toOptionalBoolean,
};
