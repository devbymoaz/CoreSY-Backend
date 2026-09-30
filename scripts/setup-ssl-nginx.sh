#!/usr/bin/env bash
# Enable HTTPS (self-signed) via Nginx reverse proxy on EC2.
# Usage on server: sudo bash scripts/setup-ssl-nginx.sh
# For a real trusted cert later: point a domain to this IP and run certbot.

set -euo pipefail

DOMAIN_OR_IP="${1:-100.54.21.155}"
APP_PORT="${APP_PORT:-3000}"
CERT_DIR="/etc/nginx/ssl"
NGINX_SITE="/etc/nginx/sites-available/coresy"

export DEBIAN_FRONTEND=noninteractive

if ! command -v nginx >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y nginx openssl
fi

mkdir -p "$CERT_DIR"

if [ ! -f "$CERT_DIR/coresy.key" ] || [ ! -f "$CERT_DIR/coresy.crt" ]; then
  openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
    -keyout "$CERT_DIR/coresy.key" \
    -out "$CERT_DIR/coresy.crt" \
    -subj "/CN=${DOMAIN_OR_IP}/O=CoreSY/C=SY" \
    -addext "subjectAltName=IP:${DOMAIN_OR_IP},DNS:${DOMAIN_OR_IP}"
  chmod 600 "$CERT_DIR/coresy.key"
  chmod 644 "$CERT_DIR/coresy.crt"
fi

cat > "$NGINX_SITE" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN_OR_IP};

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN_OR_IP};

    ssl_certificate     ${CERT_DIR}/coresy.crt;
    ssl_certificate_key ${CERT_DIR}/coresy.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 120s;
    }
}
EOF

ln -sfn "$NGINX_SITE" /etc/nginx/sites-enabled/coresy
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl restart nginx

echo "SSL_NGINX_OK"
echo "HTTPS_URL=https://${DOMAIN_OR_IP}/api/v1/health"
echo "NOTE=Self-signed cert. Browsers/Flutter will warn until you use a real domain + Let's Encrypt."
