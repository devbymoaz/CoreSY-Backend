/**
 * Prisma client re-export for src/prisma directory.
 * Provides a convenient import path within the application layer.
 */

const { prisma, connectDatabase, disconnectDatabase } = require('../config/database');

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
};
