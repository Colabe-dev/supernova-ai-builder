#!/usr/bin/env node
/**
 * Minimal migration runner for Postgres entitlements schema
 * Tracks applied migrations in schema_migrations table
 */

import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATIONS_DIR = join(__dirname, 'migrations');

async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    } catch (err) {
      console.warn('Warning: unable to ensure pgcrypto extension:', err.message);
    }

    // Ensure schema_migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Get applied migrations
    const { rows: applied } = await client.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    const appliedVersions = new Set(applied.map(r => r.version));

    // Get migration files
    const files = readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration file(s)`);

    // Apply pending migrations
    for (const file of files) {
      const version = file.replace('.sql', '');
      
      if (appliedVersions.has(version)) {
        console.log(`✓ ${version} (already applied)`);
        continue;
      }

      console.log(`→ Applying ${version}...`);
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [version]
        );
        await client.query('COMMIT');
        console.log(`✓ ${version} applied successfully`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${version} failed: ${err.message}`);
      }
    }

    console.log('\n✅ All migrations applied successfully');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
