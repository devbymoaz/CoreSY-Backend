/**
 * Quick database connection test script.
 * Usage: node scripts/test-db.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

prisma.$queryRaw`SELECT 1 as ok`
  .then(() => {
    console.log('DATABASE CONNECTION OK');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
    process.exit(0);
  })
  .catch((error) => {
    console.error('DATABASE CONNECTION FAILED');
    console.error(error.message.split('\n')[0]);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
