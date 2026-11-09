import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { readEnv } from '../config/env.js';

const migrationsDirectory = fileURLToPath(new URL('./migrations/', import.meta.url));
const pool = new Pool({ connectionString: readEnv().DATABASE_URL });

async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [724019]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = (await readdir(migrationsDirectory))
      .filter((file) => /^\\d+_[a-z0-9_-]+\\.sql$/.test(file))
      .sort();

    for (const filename of files) {
      const alreadyApplied = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [filename]
      );
      if (alreadyApplied.rowCount) continue;

      const sql = await readFile(join(migrationsDirectory, filename), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [filename]
        );
        await client.query('COMMIT');
        console.info(`Applied migration: ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [724019]);
    } finally {
      client.release();
    }
  }
}

migrate()
  .catch((error: unknown) => {
    console.error('Database migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => pool.end());
