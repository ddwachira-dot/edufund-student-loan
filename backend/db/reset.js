/*
 * DESTRUCTIVE: drops the public schema and recreates it from db/schema.sql.
 * Creates NO seed data — the database starts empty.
 *
 * To get your first admin account, run:
 *   npm run db:create-admin -- --email you@example.com --password YourPass --name "Your Name"
 *
 * Usage:  npm run db:reset
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

async function reset() {
  const client = await pool.connect();
  try {
    console.log('Dropping existing schema...');
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');

    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    console.log('Applying schema.sql...');
    await client.query(schema);

    console.log('Database reset complete (empty schema, no seed data).');
    console.log('--------------------------------------------------');
    console.log('  Create your admin account:');
    console.log('  npm run db:create-admin -- --email you@example.com --password YourPass --name "Your Name"');
    console.log('--------------------------------------------------');
  } catch (err) {
    console.error('Reset failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

reset();