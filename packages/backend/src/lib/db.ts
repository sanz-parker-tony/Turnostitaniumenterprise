import { Pool } from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

config({ path: fileURLToPath(new URL('../../.env.local', import.meta.url)) });

export const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL no esta configurada. Define la variable en packages/backend/.env.local.'
  );
}

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: false,
});

let initialized = false;

export async function ensureAuthTables(): Promise<void> {
  if (initialized) return;
  initialized = true;

  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_auth_credentials (
      auth_user_id UUID PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      email_confirmed_at TIMESTAMPTZ NULL,
      user_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_app_auth_credentials_email
    ON app_auth_credentials(email);
  `);
}
