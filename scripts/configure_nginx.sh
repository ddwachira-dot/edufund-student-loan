#!/bin/bash
set -e

echo "=== 1. Setting Permissions ==="
chown -R root:root /var/www/usfunded
chmod -R 755 /var/www/usfunded
chmod -R 777 /var/www/usfunded/backend/uploads

echo "=== 2. Backing up and updating nginx.conf ==="
cp /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf 2>/dev/null || cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak
# Add server_names_hash_bucket_size
sed -i '/default_type\s*application\/octet-stream;/a \    server_names_hash_bucket_size 64;' /etc/nginx/nginx.conf
# Comment out default server block
python3 -c "
with open('/etc/nginx/nginx.conf', 'r') as f:
    content = f.read()
import re
content = re.sub(r'(\n\s*server\s*\{[^}]*listen\s*80[^}]*location\s*=\s*/50x\.html\s*\{[^\}]*\}\s*\})', lambda m: '\n'.join('# ' + line for line in m.group(1).splitlines()), content)
with open('/etc/nginx/nginx.conf', 'w') as f:
    f.write(content)
"

echo "=== 3. Writing /etc/nginx/conf.d/usfunded.conf ==="
cat << 'NGINX_EOF' > /etc/nginx/conf.d/usfunded.conf
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name usfunded.org www.usfunded.org;

    client_max_body_size 25M;

    # Frontend SPA
    location / {
        root /var/www/usfunded/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Static assets caching
    location /assets/ {
        root /var/www/usfunded/frontend/dist;
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }

    # Backend API reverse proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }
}
NGINX_EOF

echo "=== 4. Testing Nginx config ==="
nginx -t

echo "=== 5. Starting and Enabling Nginx ==="
systemctl enable nginx
systemctl restart nginx

echo "=== 6. Testing HTTP response locally ==="
curl -I http://127.0.0.1/
curl -s http://127.0.0.1/api/health
echo ""
