#!/usr/bin/env bash
# Restore production .env and allow coresyhub.com CORS
set -euo pipefail

APP_DIR="/home/ubuntu/CoreSY-Backend"
cd "$APP_DIR"

cat > .env <<'EOF'
NODE_ENV=production
PORT=3000
APP_NAME=CoreSY
API_PREFIX=/api/v1
API_BASE_URL=https://api.coresyhub.com/api/v1
PUBLIC_BASE_URL=https://api.coresyhub.com
SEED_ON_START=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRES_IN=30d
BCRYPT_SALT_ROUNDS=12
CORS_ORIGIN=http://localhost:52470,http://localhost:8080,http://localhost:3000,http://100.54.21.155:3000,http://localhost:,http://127.0.0.1:,http://localhost:5173,https://coresyhub.com,https://www.coresyhub.com,http://coresyhub.com,http://www.coresyhub.com
LOG_LEVEL=info
LOG_DIR=src/logs
SWAGGER_TITLE=CoreSY API
SWAGGER_VERSION=1.0.0
SWAGGER_DESCRIPTION=CoreSY Enterprise Backend API Documentation
SWAGGER_BASE_PATH=/api/v1
OTP_LENGTH=6
OTP_EXPIRY_SECONDS=900
PASSWORD_RESET_OTP_EXPIRY_SECONDS=900
RESEND_COOLDOWN_SECONDS=60
DATABASE_URL=postgresql://appuser:password@localhost:5432/coresy_db?schema=public
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=devbymoaz@gmail.com
SMTP_PASS=mjxggwpzrgpxwypu
SMTP_FROM=CoreSY <devbymoaz@gmail.com>
EOF

echo "ENV_RESTORED"
wc -l .env
grep '^CORS_ORIGIN=' .env
pm2 restart coresy --update-env
sleep 4
curl -s http://127.0.0.1:3000/api/v1/health
echo
curl -s https://api.coresyhub.com/api/v1/health
echo
