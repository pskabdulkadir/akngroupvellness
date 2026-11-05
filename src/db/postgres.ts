/**
 * Pure PostgreSQL Database Client & Schema Bootstrap
 * AKN Global Group Ltd. - Production Architecture
 *
 * Replaces Supabase/Firebase with pure PostgreSQL (pg driver).
 * Connects via DATABASE_URL with atomic transactions and an idempotent,
 * non-destructive schema bootstrap that runs on every server start.
 */

import { Pool, PoolClient } from 'pg';

export const DATABASE_URL = process.env.DATABASE_URL || '';

const SCHEMA_BOOTSTRAP_LOCK_KEY = 1574130995;

const SELF_HEALING_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS monoline_member_registry (
    user_id TEXT PRIMARY KEY,
    global_line_id INTEGER NOT NULL UNIQUE,
    archived_at TIMESTAMPTZ,
    member_data_ciphertext BYTEA NOT NULL,
    credential_ciphertext BYTEA,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE monoline_member_registry ADD COLUMN IF NOT EXISTS global_line_id INTEGER`,
  `ALTER TABLE monoline_member_registry ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`,
  `ALTER TABLE monoline_member_registry ADD COLUMN IF NOT EXISTS member_data_ciphertext BYTEA`,
  `ALTER TABLE monoline_member_registry ADD COLUMN IF NOT EXISTS credential_ciphertext BYTEA`,
  `ALTER TABLE monoline_member_registry ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  `CREATE TABLE IF NOT EXISTS pending_member_registrations (
    registration_id TEXT PRIMARY KEY,
    payment_token_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    merchant_oid TEXT UNIQUE,
    payload_ciphertext BYTEA NOT NULL,
    member_user_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_at TIMESTAMPTZ
  )`,
  `ALTER TABLE pending_member_registrations ADD COLUMN IF NOT EXISTS email_hash TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS pending_member_registrations_open_email_idx
    ON pending_member_registrations (email_hash)
    WHERE status IN ('PENDING_PAYMENT', 'ACTIVATING', 'PAID_NEEDS_REVIEW')`,
];

let pool: Pool | null = null;
let isConnected = false;

export function getPostgresPool(): Pool {
  if (pool) return pool;

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required!');
  }

  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('[PostgreSQL] Unexpected error on idle client:', err.message);
  });

  return pool;
}

export async function runDatabaseMigrations(): Promise<void> {
  const client = await getPostgresPool().connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [SCHEMA_BOOTSTRAP_LOCK_KEY]);
    for (const statement of SELF_HEALING_SCHEMA_STATEMENTS) {
      await client.query(statement);
    }
    isConnected = true;
    console.log('[PostgreSQL] Connected and schema verified.');
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [SCHEMA_BOOTSTRAP_LOCK_KEY]).catch(() => {});
    client.release();
  }
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const p = getPostgresPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export function isPostgresConnected(): boolean {
  return isConnected;
}
