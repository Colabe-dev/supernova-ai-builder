import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { InsertProject } from '@shared/schema';

delete process.env.DATABASE_URL;
process.env.NODE_ENV = 'test';

const { DrizzleStorage } = await import('./storage');

let createPgMem: (() => any) | undefined;

try {
  const pgMemModule = await import('pg-mem');
  createPgMem = () => {
    const db = pgMemModule.newDb({ autoCreateForeignKeyIndices: true });
    db.public.registerFunction({
      name: 'gen_random_uuid',
      returns: 'uuid',
      implementation: () => randomUUID(),
    });
    return db;
  };
} catch (error) {
  console.warn('pg-mem not available, skipping DrizzleStorage persistence tests');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const migrationsFolder = resolve(__dirname, './db/migrations');

async function createStorageForTest() {
  if (!createPgMem) {
    throw new Error('pg-mem is required for this test');
  }
  const mem = createPgMem();
  const adapter = mem.adapters.createPg();
  const pool = new adapter.Pool();
  const storage = await DrizzleStorage.create({ pool, migrationsFolder });
  return { storage, mem, adapter };
}

test('DrizzleStorage performs health check after migrations', { skip: !createPgMem && 'pg-mem not available' }, async () => {
  if (!createPgMem) return;
  const { storage } = await createStorageForTest();

  const health = await storage.healthCheck();
  assert.equal(health.ok, true);
  assert.deepEqual(health.migrations.pending, []);
  assert.ok(health.migrations.applied.length >= 1);

  await storage.close();
});

test('data survives storage reinitialization', { skip: !createPgMem && 'pg-mem not available' }, async () => {
  if (!createPgMem) return;
  const mem = createPgMem();
  const adapter = mem.adapters.createPg();

  const poolA = new adapter.Pool();
  const storageA = await DrizzleStorage.create({ pool: poolA, migrationsFolder });

  const projectInput: InsertProject = {
    name: 'Persistence check',
    description: 'ensure restarts keep data',
    type: 'web',
    templateId: 'next-14-tailwind',
    status: 'draft',
  };

  const project = await storageA.createProject(projectInput);
  await storageA.createAgentRun({
    projectId: project.id,
    agentType: 'planner',
    status: 'running',
    input: 'plan project',
    output: null,
  });
  await storageA.createOrUpdateEntitlement({
    profileId: 'tester',
    coins: { balance: 0, total: 0 },
    subscriptions: [],
    purchases: [],
  });
  await storageA.creditCoins('tester', 10, 'initial grant');
  await storageA.close();

  const poolB = new adapter.Pool();
  const storageB = await DrizzleStorage.create({ pool: poolB, migrationsFolder });

  const projects = await storageB.getProjects();
  assert.equal(projects.length, 1);
  assert.equal(projects[0].id, project.id);

  const entitlement = await storageB.getEntitlement('tester');
  assert.ok(entitlement);
  assert.equal((entitlement!.coins as any).balance, 10);
  assert.equal((entitlement!.coins as any).total, 10);

  const templates = await storageB.getTemplates();
  assert.ok(templates.length >= 2);

  await storageB.close();
});
