/**
 * Prisma database seed script.
 * Seeds default Syrian governorates with codes and the default USER role.
 */

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

const seed = async () => {
  console.log('Seeding governorates...');

  for (const governorate of GOVERNORATES) {
    await prisma.governorate.upsert({
      where: { code: governorate.code },
      update: { name: governorate.name, nameAr: governorate.nameAr },
      create: governorate,
    });
  }

  console.log(`Seeded ${GOVERNORATES.length} governorates.`);

  console.log('Seeding roles...');

  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  console.log(`Seeded ${DEFAULT_ROLES.length} roles.`);
  console.log('Database seed completed successfully.');
};

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
