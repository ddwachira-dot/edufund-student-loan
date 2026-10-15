#!/bin/bash
cat << 'EOF' > /etc/nginx/conf.d/usfunded.conf
server {
    server_name usfunded.org www.usfunded.org;

    client_max_body_size 25M;

    # Frontend SPA - Never cache index.html
    location / {
        root /var/www/usfunded/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
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

    listen [::]:443 ssl ipv6only=on; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/usfunded.org/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/usfunded.org/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = usfunded.org) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80 default_server;
    listen [::]:80 default_server;
    server_name usfunded.org www.usfunded.org;
    return 404; # managed by Certbot
}
EOF

nginx -t
systemctl reload nginx
