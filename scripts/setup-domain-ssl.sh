#!/usr/bin/env bash
# Setup Let's Encrypt SSL for api.coresyhub.com
set -euo pipefail

DOMAIN="api.coresyhub.com"
APP_PORT="${APP_PORT:-3000}"
SITE="/etc/nginx/sites-available/coresy"

export DEBIAN_FRONTEND=noninteractive

if ! command -v certbot >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y certbot python3-certbot-nginx
fi

cat > "$SITE" <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name api.coresyhub.com 100.54.21.155;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 120s;
    }
}
EOF

ln -sfn "$SITE" /etc/nginx/sites-enabled/coresy
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect

nginx -t
systemctl reload nginx

echo "SSL_OK"
echo "BASE_URL=https://${DOMAIN}/api/v1"
echo "HEALTH=https://${DOMAIN}/api/v1/health"
