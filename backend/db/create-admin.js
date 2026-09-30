/*
 * CLI to create (or promote) an admin user directly in the database.
 * Run it once after `npm run db:reset` since the database now starts empty.
 *
 * Usage (non-interactive):
 *   npm run db:create-admin -- --email you@example.com --password YourPass --name "Your Name"
 *
 * Usage (interactive — prompts for anything not provided):
 *   npm run db:create-admin
 */
require('dotenv').config();

const readline = require('readline');
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()); }));
}

async function main() {
  const email = arg('email') || (await ask('Admin email: '));
  const password = arg('password') || (await ask('Password (min 8 chars): '));
  const name = arg('name') || (await ask('Name: '));

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('A valid email is required');
  }
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  if (!name) {
    throw new Error('A name is required');
  }

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       name = EXCLUDED.name,
       role = 'admin'
     RETURNING id, email, name, role, created_at`,
    [email.toLowerCase(), hash, name]
  );
  console.log(`Admin ready -> ${rows[0].email} (${rows[0].name})`);
  await pool.end();
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exitCode = 1;
  pool.end();
});