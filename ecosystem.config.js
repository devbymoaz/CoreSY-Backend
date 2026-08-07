/**
 * PM2 process manager configuration for AWS EC2 production deployment.
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [
    {
      name: 'coresy-api',
      script: 'prisma/migrate-and-start.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: 'src/logs/pm2-error.log',
      out_file: 'src/logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
