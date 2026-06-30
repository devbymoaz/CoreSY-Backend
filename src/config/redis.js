/**
 * Redis client initialization and connection management.
 * Completely optional - API will work fine without Redis.
 */

const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

let redisClient = null;
let redisAvailable = false;

/**
 * Create and connect to Redis - never fails, just returns null if unavailable.
 * @returns {Promise<Redis|null>}
 */
const connectRedis = async () => {
  if (redisClient && redisAvailable) {
    return redisClient;
  }

  // If no Redis URL configured, don't even try to connect
  if (!config.redis.url && !config.redis.host) {
    logger.info('Redis not configured - skipping connection');
    return null;
  }

  try {
    const redisOptions = config.redis.url
      ? config.redis.url
      : {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password || undefined,
          db: config.redis.db,
        };

    redisClient = new Redis(redisOptions, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Don't retry - fail fast
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      redisAvailable = true;
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (error) => {
      redisAvailable = false;
      logger.debug('Redis connection error:', error.message);
    });

    redisClient.on('close', () => {
      redisAvailable = false;
      logger.debug('Redis connection closed');
    });

    await redisClient.connect();
    redisAvailable = true;
    return redisClient;
  } catch (error) {
    redisAvailable = false;

    if (redisClient) {
      try {
        redisClient.disconnect();
      } catch (e) {
        // Ignore disconnection errors
      }
      redisClient = null;
    }

    logger.info('Redis not available - features will work without it');
    return null;
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
