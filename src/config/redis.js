/**
 * Redis client initialization and connection management.
 * Provides a singleton Redis connection for caching and session storage.
 * In development, Redis can be optional so the API still starts without it.
 */

const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

let redisClient = null;
let redisAvailable = false;

/**
 * Create and connect to Redis.
 * @returns {Promise<Redis|null>}
 */
const connectRedis = async () => {
  if (redisClient && redisAvailable) {
    return redisClient;
  }

  try {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 10) {
          logger.error('Redis max reconnection attempts reached');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      redisAvailable = true;
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (error) => {
      redisAvailable = false;
      logger.error('Redis connection error:', error.message);
    });

    redisClient.on('close', () => {
      redisAvailable = false;
      logger.warn('Redis connection closed');
    });

    await redisClient.connect();
    redisAvailable = true;
    return redisClient;
  } catch (error) {
    redisAvailable = false;

    if (redisClient) {
      redisClient.disconnect();
      redisClient = null;
    }

    if (config.redis.optional) {
      logger.warn(
        'Redis is not available. OTP and rate-limit features will not work until Redis is running.',
      );
      return null;
    }

    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

/**
 * Get the Redis client instance.
 * @returns {Redis|null}
 */
const getRedisClient = () => (redisAvailable ? redisClient : null);

/**
 * Whether Redis is connected and ready.
 * @returns {boolean}
 */
const isRedisAvailable = () => redisAvailable;

/**
 * Gracefully disconnect from Redis.
 * @returns {Promise<void>}
 */
const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    redisAvailable = false;
    logger.info('Redis disconnected');
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  isRedisAvailable,
  disconnectRedis,
};
