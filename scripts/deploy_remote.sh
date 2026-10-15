#!/bin/bash
set -e

echo "=== 1. Configuring PostgreSQL ==="
sed -i "s/listen_addresses = .*/listen_addresses = '127.0.0.1, ::1'/" /var/lib/pgsql/data/postgresql.conf
systemctl restart postgresql
sleep 2

sudo -u postgres psql -d student_loan -c "GRANT ALL ON SCHEMA public TO edufund_user; ALTER SCHEMA public OWNER TO edufund_user;"

# Test PostgreSQL connection
PGPASSWORD='EduFund_Secure_2026!' psql -h 127.0.0.1 -U edufund_user -d student_loan -c "SELECT current_user, current_database();"

echo "=== 2. Creating directory structure ==="
mkdir -p /var/www/usfunded/backend/uploads
mkdir -p /var/www/usfunded/frontend/dist

echo "=== 3. Checking Git clone / pull of repository ==="
if [ ! -d /var/www/usfunded/repo ]; then
    git clone https://github.com/ddwachira-dot/edufund-student-loan.git /var/www/usfunded/repo
else
    cd /var/www/usfunded/repo
    git pull
fi

echo "=== 4. Setting up Backend ==="
cp -r /var/www/usfunded/repo/backend/* /var/www/usfunded/backend/
cd /var/www/usfunded/backend

# Generate random JWT secret
JWT_SECRET=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 48)

cat <<ENVEOF > /var/www/usfunded/backend/.env
PORT=5000
DATABASE_URL=postgres://edufund_user:EduFund_Secure_2026!@127.0.0.1:5432/student_loan
JWT_SECRET=${JWT_SECRET}
PAYSTACK_SECRET_KEY=sk_live_dummy
PAYSTACK_PUBLIC_KEY=pk_live_dummy
PAYSTACK_BASE_URL=https://api.paystack.co
SIMULATION_ENABLED=false
ENVEOF

npm install --production

echo "=== 5. Running Database Migrations ==="
# Initialize database schema from db/schema.sql
PGPASSWORD='EduFund_Secure_2026!' psql -h 127.0.0.1 -U edufund_user -d student_loan -f /var/www/usfunded/backend/db/schema.sql

# Create default admin account: admin@usfunded.org / AdminPass2026!
node db/create-admin.js --email admin@usfunded.org --password "AdminPass2026!" --name "System Administrator"

echo "=== 6. Managing Backend with PM2 ==="
pm2 delete edufund-backend 2>/dev/null || true
pm2 start src/index.js --name edufund-backend
pm2 save
pm2 startup systemd -u root --hp /root | bash || true

echo "=== 7. Backend status ==="
pm2 status
curl -s http://127.0.0.1:5000/api/health
echo ""
