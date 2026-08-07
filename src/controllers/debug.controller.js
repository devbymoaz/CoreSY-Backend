/**
 * Debug controller - help diagnose issues!
 */

const { prisma } = require('../config/database');
const { sendSuccess } = require('../helpers/response.helper');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { TEST_ACCOUNTS } = require('../../prisma/seed-demo');

const TEST_EMAILS = [
  TEST_ACCOUNTS.admin.email,
  TEST_ACCOUNTS.customer.email,
  TEST_ACCOUNTS.businessOwner.email,
];

/**
 * GET /debug - Debug info endpoint (no secrets exposed!)
 */
const getDebugInfo = asyncHandler(async (_req, res) => {
  let governorateCount = 0;
  let testUsers = [];

  try {
    governorateCount = await prisma.governorate.count({ where: { isActive: true } });
    testUsers = await prisma.user.findMany({
      where: { email: { in: TEST_EMAILS } },
      select: {
        email: true,
        status: true,
        emailVerified: true,
        role: { select: { name: true } },
      },
    });
  } catch (error) {
    logger.warn('Debug DB check failed:', error.message);
  }

  const driverExists = await prisma.driver.findUnique({
    where: { email: TEST_ACCOUNTS.driver.email },
    select: { email: true, status: true },
  });

  const envInfo = {
    NODE_ENV: process.env.NODE_ENV || 'not set',
    PORT: process.env.PORT || 'not set',
    DATABASE_URL_SET: !!process.env.DATABASE_URL,
    DATABASE_URL_LENGTH: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0,
    REDIS_URL_SET: !!process.env.REDIS_URL,
    APP_NAME: process.env.APP_NAME || 'CoreSY',
    governorateCount,
    testUsersReady: testUsers.length === TEST_EMAILS.length,
    testUsers,
    driverReady: !!driverExists,
    driver: driverExists,
    seedHint: 'Run: node scripts/ensure-test-users.js',
  };

  logger.info('Debug info requested:', envInfo);

  return sendSuccess(res, {
    message: 'Debug info (no secrets exposed)',
    data: envInfo,
  });
});

module.exports = {
  getDebugInfo,
};
