/**
 * Ensures governorates and test accounts exist in the database.
 * Run on the server when login fails with "Invalid email/phone or password".
 *
 * Usage: node scripts/ensure-test-users.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { SYRIAN_GOVERNORATES } = require('../src/constants/governorates');
const { seedDemoData, TEST_PASSWORD, TEST_ACCOUNTS } = require('../prisma/seed-demo');

const prisma = new PrismaClient();

async function ensureGovernorates() {
  for (const gov of SYRIAN_GOVERNORATES) {
    await prisma.governorate.upsert({
      where: { code: gov.code },
      update: {
        name: gov.name,
        nameAr: gov.nameAr,
        isActive: true,
      },
      create: {
        name: gov.name,
        nameAr: gov.nameAr,
        code: gov.code,
      },
    });
  }
}

async function main() {
  console.log('🔧 Ensuring governorates and test accounts...');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const roleCount = await prisma.role.count();
  if (roleCount === 0) {
    throw new Error('No roles found. Run full seed first: npm run prisma:seed');
  }

  await ensureGovernorates();
  console.log(`✅ Governorates ready (${SYRIAN_GOVERNORATES.length})`);

  await seedDemoData(prisma);

  const emails = Object.values(TEST_ACCOUNTS)
    .filter((account) => account.email)
    .map((account) => account.email);

  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true, status: true, emailVerified: true, role: { select: { name: true } } },
  });

  console.log('');
  console.log('📋 Verified users in database:');
  for (const user of users) {
    console.log(
      `   ${user.email} | role=${user.role.name} | verified=${user.emailVerified} | status=${user.status}`,
    );
  }

  console.log('');
  console.log(`🔑 Password for all test accounts: ${TEST_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
