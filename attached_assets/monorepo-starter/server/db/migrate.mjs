import fs from 'fs'; import fsp from 'fs/promises'; import path from 'path'; import { Pool } from 'pg'; import 'dotenv/config';
const ROOT = process.cwd(); const MIGDIR = path.join(ROOT, 'db', 'migrations');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function ensure(client){ await client.query('create table if not exists schema_migrations (filename text primary key, applied_at timestamptz not null default now())'); }
async function applied(client){ const { rows } = await client.query('select filename from schema_migrations'); return new Set(rows.map(r=>r.filename)); }
async function applyOne(client, file){ const sql = await fsp.readFile(path.join(MIGDIR, file), 'utf8'); await client.query('begin'); try { await client.query(sql); await client.query('insert into schema_migrations(filename) values($1)', [file]); await client.query('commit'); } catch(e){ await client.query('rollback'); throw e; } }
const files = (await fsp.readdir(MIGDIR)).filter(f=>f.endsWith('.sql')).sort();
const c = await pool.connect(); try { await ensure(c); const done = await applied(c); for (const f of files){ if (!done.has(f)) { console.log('Applying', f); await applyOne(c, f); } } console.log('Migrations complete.'); } finally { c.release(); await pool.end(); }
