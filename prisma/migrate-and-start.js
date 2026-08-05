require('dotenv').config();
const { execSync } = require('child_process');

console.log('🚀 Starting CoreSY Backend...');

try {
  console.log('📊 Running Prisma migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });

  const shouldSeed = process.env.SEED_ON_START !== 'false';
  if (shouldSeed) {
    console.log('🌱 Running database seed...');
    execSync('node prisma/seed.js', { stdio: 'inherit' });
  }

  console.log('✅ Migrations completed! Starting server...');
  require('../src/server.js');
} catch (error) {
  console.error('❌ Failed to start:', error);
  process.exit(1);
}
