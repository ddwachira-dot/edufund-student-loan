#!/bin/bash
set -e

echo "=== 1. Applying Database Migration for Firebase ==="
PGPASSWORD='EduFund_Secure_2026!' psql -h 127.0.0.1 -U edufund_user -d student_loan << 'SQLEOF'
ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(128);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
SQLEOF

echo "=== 2. Updating Backend Configuration ==="
if ! grep -q "FIREBASE_PROJECT_ID" /var/www/usfunded/backend/.env; then
    echo "FIREBASE_PROJECT_ID=usfunded-org" >> /var/www/usfunded/backend/.env
fi

echo "=== 3. Installing Backend Dependencies on Server ==="
cd /var/www/usfunded/backend
npm install --omit=dev

echo "=== 4. Restarting Backend with PM2 ==="
pm2 restart edufund-backend

echo "=== 5. Setting Permissions ==="
chmod -R 755 /var/www/usfunded/frontend/dist

echo "=== 6. Health Check ==="
curl -s http://127.0.0.1:5000/api/health
echo ""
pm2 status
