/**
 * Setup script for Windows - verifies DB, runs migrations, and seeds data.
 * Usage: npm run setup
 */

const { execSync } = require('child_process');
const path = require('path');

require('dotenv').config();

const run = (command) => {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
};

const testConnection = async () => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection: OK');
    console.log(`Database: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')}`);
  } catch (error) {
    console.error('\nDatabase connection FAILED.');
    console.error('Update DATABASE_URL in .env with your PostgreSQL username and password.');
    console.error('Example: postgresql://postgres:YOUR_PASSWORD@localhost:5432/coresy_db?schema=public');
    console.error(error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

const main = async () => {
  console.log('=== CoreSY Backend Setup ===');
  await testConnection();
  run('npx prisma generate');
  run('npx prisma migrate deploy');
  run('node prisma/seed.js');
  console.log('\n=== Setup complete ===');
  console.log('Run: npm run dev');
  console.log('Swagger: http://localhost:3000/api-docs');
};

main().catch((error) => {
  console.error('Setup failed:', error.message);
  process.exit(1);
});
