/**
 * Environment configuration loader.
 * Validates and exports all application environment variables with sensible defaults.
 */

require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  appName: process.env.APP_NAME || 'CoreSY',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    optional: process.env.REDIS_OPTIONAL === 'true' || process.env.NODE_ENV === 'development',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
  },

  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
      : ['http://localhost:3000'],
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'src/logs',
  },

  swagger: {
    title: process.env.SWAGGER_TITLE || 'CoreSY API',
    version: process.env.SWAGGER_VERSION || '1.0.0',
    description: process.env.SWAGGER_DESCRIPTION || 'CoreSY Enterprise Backend API Documentation',
    basePath: process.env.SWAGGER_BASE_PATH || '/api/v1',
  },

  auth: {
    otpLength: parseInt(process.env.OTP_LENGTH, 10) || 6,
    otpExpirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS, 10) || 900,
    passwordResetOtpExpirySeconds:
      parseInt(process.env.PASSWORD_RESET_OTP_EXPIRY_SECONDS, 10) || 900,
    resendCooldownSeconds: parseInt(process.env.RESEND_COOLDOWN_SECONDS, 10) || 60,
  },
};

// Validate critical environment variables in production
if (config.env === 'production') {
  const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = config;
