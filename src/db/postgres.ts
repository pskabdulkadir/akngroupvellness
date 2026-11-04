/**
 * Pure PostgreSQL Database Client & Migration Engine
 * AKN Global Group Ltd. - Production Architecture
 * 
 * Replaces Supabase/Firebase with pure PostgreSQL (pg driver).
 * Connects via DATABASE_URL with atomic transactions and automated migrations.
 */

import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';

export const DATABASE_URL = process.env.DATABASE_URL || '';

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
  const p = getPostgresPool();
  const client = await p.connect();
  const migrationDir = path.join(process.cwd(), 'db', 'migrations');
  try {
    await client.query('SELECT pg_advisory_lock($1)', [1574130995]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationFiles = fs.readdirSync(migrationDir).filter((file) => file.endsWith('.sql')).sort();
    if (migrationFiles.length === 0) throw new Error(`No database migrations found in ${migrationDir}`);

    for (const file of migrationFiles) {
      const alreadyApplied = await client.query(
        'SELECT 1 FROM schema_migrations WHERE version = $1',
        [file]
      );
      if (alreadyApplied.rowCount) continue;

      await client.query('BEGIN');
      try {
        await client.query(fs.readFileSync(path.join(migrationDir, file), 'utf8'));
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    isConnected = true;
    console.log('[PostgreSQL] Connected and database migrations applied.');
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [1574130995]).catch(() => {});
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
