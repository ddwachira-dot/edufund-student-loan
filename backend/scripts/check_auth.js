const { auth } = require('/var/www/usfunded/backend/src/config/firebase');
const pool = require('/var/www/usfunded/backend/src/config/db');

async function main() {
  console.log('--- Checking Firebase Users ---');
  try {
    const list = await auth.listUsers(50);
    console.log(`Found ${list.users.length} Firebase user(s):`);
    for (const u of list.users) {
      console.log(` - ${u.email} (UID: ${u.uid})`);
    }
  } catch (err) {
    console.error('Firebase listUsers error:', err.message);
  }

  console.log('\n--- Checking Postgres Users ---');
  try {
    const { rows } = await pool.query('SELECT id, email, name, role, firebase_uid FROM users ORDER BY id');
    for (const r of rows) {
      console.log(` - [${r.role}] ${r.email} (${r.name}) - UID: ${r.firebase_uid || 'None'}`);
    }
  } catch (err) {
    console.error('Postgres query error:', err.message);
  }

  process.exit(0);
}

main();
