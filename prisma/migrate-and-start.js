require('dotenv').config();
const { execSync } = require('child_process');

console.log('🚀 Starting CoreSY Backend...');

try {
  console.log('📊 Running Prisma migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  console.log('✅ Migrations completed! Starting server...');
  require('../src/server.js');
} catch (error) {
  console.error('❌ Failed to start:', error);
  process.exit(1);
}
