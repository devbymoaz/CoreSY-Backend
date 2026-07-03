/**
 * Sync incomplete local database schema for development.
 * Prepares existing roles rows, then pushes the full Prisma schema.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

const prepareRoles = async () => {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'roles' AND column_name = 'display_name'
      ) THEN
        ALTER TABLE roles ADD COLUMN display_name TEXT;
        UPDATE roles SET display_name = name WHERE display_name IS NULL;
        ALTER TABLE roles ALTER COLUMN display_name SET NOT NULL;
      END IF;
    END $$;
  `);
};

const main = async () => {
  console.log('Preparing roles table...');
  await prepareRoles();
  await prisma.$disconnect();

  console.log('Pushing Prisma schema...');
  execSync('npx prisma db push --accept-data-loss', {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });

  console.log('Marking migrations as applied...');
  execSync('npx prisma migrate resolve --applied 20260703120000_add_product_module', {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });

  console.log('Schema sync completed.');
};

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
