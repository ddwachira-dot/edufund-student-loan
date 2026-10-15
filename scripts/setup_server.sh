#!/bin/bash
set -e

echo "=== 1. Installing EPEL ==="
dnf install -y epel-release

echo "=== 2. Enabling and Installing Node.js 20 ==="
dnf module reset -y nodejs
dnf module enable -y nodejs:20
dnf install -y nodejs

echo "=== 3. Enabling and Installing PostgreSQL 16 ==="
dnf module reset -y postgresql
dnf module enable -y postgresql:16
dnf install -y postgresql-server postgresql-contrib

echo "=== 4. Installing Nginx, Git, Certbot ==="
dnf install -y nginx git certbot python3-certbot-nginx

echo "=== 5. Installing PM2 ==="
npm install -g pm2

echo "=== 6. Initializing PostgreSQL ==="
if [ ! -f /var/lib/pgsql/data/PG_VERSION ]; then
    postgresql-setup --initdb
fi

# Ensure password authentication is allowed for localhost
# Add scram-sha-256 / md5 entries before the ident entries if not present
if ! grep -q "student_loan" /var/lib/pgsql/data/pg_hba.conf; then
    sed -i '/# TYPE  DATABASE        USER            ADDRESS                 METHOD/a host    all             all             127.0.0.1/32            scram-sha-256\nhost    all             all             ::1/128                 scram-sha-256\nlocal   all             all                                     trust' /var/lib/pgsql/data/pg_hba.conf
fi

systemctl enable postgresql
systemctl restart postgresql

echo "=== 7. Configuring PostgreSQL User and Database ==="
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='edufund_user'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE USER edufund_user WITH ENCRYPTED PASSWORD 'EduFund_Secure_2026!';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='student_loan'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE DATABASE student_loan OWNER edufund_user;"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE student_loan TO edufund_user;"

# Test connecting to PostgreSQL with edufund_user
PGPASSWORD='EduFund_Secure_2026!' psql -h 127.0.0.1 -U edufund_user -d student_loan -c "SELECT 1;"

echo "=== 8. Creating Project Directories ==="
mkdir -p /var/www/usfunded/backend/uploads
mkdir -p /var/www/usfunded/frontend/dist

echo "=== Stack Setup Successfully Finished ==="
node -v
npm -v
psql --version
nginx -v
pm2 -v
