/**
 * Simple script to run Prisma migrations and seed data.
 */

require('dotenv').config();
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const GOVERNORATES = [
  { name: 'Damascus', nameAr: 'دمشق', code: 'DM' },
  { name: 'Aleppo', nameAr: 'حلب', code: 'AL' },
  { name: 'Homs', nameAr: 'حمص', code: 'HO' },
  { name: 'Hama', nameAr: 'حماة', code: 'HA' },
  { name: 'Latakia', nameAr: 'اللاذقية', code: 'LA' },
  { name: 'Tartus', nameAr: 'طرطوس', code: 'TA' },
  { name: 'Idlib', nameAr: 'إدلب', code: 'ID' },
  { name: 'Deir ez-Zor', nameAr: 'دير الزور', code: 'DZ' },
  { name: 'Raqqa', nameAr: 'الرقة', code: 'RQ' },
  { name: 'Hasakah', nameAr: 'الحسكة', code: 'HK' },
  { name: 'Daraa', nameAr: 'درعا', code: 'DR' },
  { name: 'Quneitra', nameAr: 'القنيطرة', code: 'QU' },
  { name: 'Suwayda', nameAr: 'السويداء', code: 'SW' },
  { name: 'Damascus Countryside', nameAr: 'ريف دمشق', code: 'RD' },
];

const DEFAULT_ROLES = [
  { name: 'USER', description: 'Default platform user with standard access' },
  { name: 'ADMIN', description: 'Platform administrator with elevated access' },
];

async function main() {
  console.log('🚀 Running Prisma migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('✅ Migrations completed!');

  console.log('🌱 Seeding database...');

  // Seed governorates
  for (const gov of GOVERNORATES) {
    await prisma.governorate.upsert({
      where: { code: gov.code },
      update: gov,
      create: gov,
    });
  }
  console.log(`✅ Seeded ${GOVERNORATES.length} governorates`);

  // Seed roles
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: role,
      create: role,
    });
  }
  console.log(`✅ Seeded ${DEFAULT_ROLES.length} roles`);

  console.log('🎉 All done! Database is ready.');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
