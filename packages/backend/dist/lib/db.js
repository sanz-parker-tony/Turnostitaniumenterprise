import { Pool } from 'pg';
const DEFAULT_DATABASE_URL = 'postgresql://postgres:51mul4cr05.5n9r-2025@192.168.71.104:5432/tt_db';
const databaseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
process.env.DATABASE_URL = databaseUrl;
export const pool = new Pool({
    connectionString: databaseUrl,
    ssl: false,
});
let initialized = false;
export async function ensureAuthTables() {
    if (initialized)
        return;
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
//# sourceMappingURL=db.js.map