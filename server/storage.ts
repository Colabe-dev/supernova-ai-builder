import {
  type Project,
  type InsertProject,
  type Template,
  type InsertTemplate,
  type AgentRun,
  type InsertAgentRun,
  type Approval,
  type InsertApproval,
  type Snapshot,
  type InsertSnapshot,
  type DiffApproval,
  type InsertDiffApproval,
  type Entitlement,
  type InsertEntitlement,
  projects,
  templates,
  agentRuns,
  approvals,
  snapshots,
  diffApprovals,
  entitlements,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool as PgPool, PoolConfig } from "pg";
import pg from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { desc, eq } from "drizzle-orm";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_MIGRATIONS_FOLDER = join(__dirname, "db", "migrations");

export interface IStorage {
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;

  getTemplates(): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;

  getAgentRuns(projectId: string): Promise<AgentRun[]>;
  getAgentRun(id: string): Promise<AgentRun | undefined>;
  createAgentRun(agentRun: InsertAgentRun): Promise<AgentRun>;
  updateAgentRun(id: string, updates: Partial<AgentRun>): Promise<AgentRun | undefined>;

  getApprovals(): Promise<Approval[]>;
  getApproval(id: string): Promise<Approval | undefined>;
  createApproval(approval: InsertApproval): Promise<Approval>;
  updateApproval(id: string, updates: Partial<Approval>): Promise<Approval | undefined>;

  // Sprint 3: Snapshots & Diff Approvals
  getSnapshots(): Promise<Snapshot[]>;
  getSnapshot(id: string): Promise<Snapshot | undefined>;
  createSnapshot(snapshot: InsertSnapshot): Promise<Snapshot>;
  deleteSnapshot(id: string): Promise<boolean>;

  getDiffApprovals(): Promise<DiffApproval[]>;
  getDiffApproval(id: string): Promise<DiffApproval | undefined>;
  createDiffApproval(approval: InsertDiffApproval): Promise<DiffApproval>;
  updateDiffApproval(id: string, updates: Partial<DiffApproval>): Promise<DiffApproval | undefined>;

  // Sprint 4 Add-ons: Entitlements
  getEntitlement(profileId: string): Promise<Entitlement | undefined>;
  createOrUpdateEntitlement(entitlement: InsertEntitlement): Promise<Entitlement>;
  creditCoins(profileId: string, amount: number, reason: string): Promise<Entitlement>;
  debitCoins(profileId: string, amount: number, reason: string): Promise<Entitlement | undefined>;
  addSubscription(profileId: string, plan: string): Promise<Entitlement>;
  addPurchase(profileId: string, purchase: any): Promise<Entitlement>;
  healthCheck(): Promise<StorageHealth>;
}

export type StorageHealth = {
  ok: boolean;
  migrations: {
    applied: string[];
    pending: string[];
  };
  error?: string;
};

type CoinsState = { balance: number; total: number };

function parseNumber(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toCoins(value: unknown): CoinsState {
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    return {
      balance: parseNumber(record.balance),
      total: parseNumber(record.total),
    };
  }

  return { balance: 0, total: 0 };
}

function toArray<T>(value: unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

type StorageSchema = {
  projects: typeof projects;
  templates: typeof templates;
  agentRuns: typeof agentRuns;
  approvals: typeof approvals;
  snapshots: typeof snapshots;
  diffApprovals: typeof diffApprovals;
  entitlements: typeof entitlements;
};

type StorageDatabase = NodePgDatabase<StorageSchema>;

type DrizzleStorageOptions = {
  connectionString?: string;
  pool?: PgPool;
  migrationsFolder?: string;
};

export class DrizzleStorage implements IStorage {
  private readonly pool: PgPool;
  private readonly db: StorageDatabase;
  private readonly migrationsFolder: string;
  private appliedMigrations: Set<string> = new Set();
  private knownMigrations: string[] = [];

  private constructor(pool: PgPool, db: StorageDatabase, migrationsFolder: string) {
    this.pool = pool;
    this.db = db;
    this.migrationsFolder = migrationsFolder;
  }

  static async create(options: DrizzleStorageOptions = {}): Promise<DrizzleStorage> {
    const migrationsFolder = options.migrationsFolder ?? DEFAULT_MIGRATIONS_FOLDER;
    const pool =
      options.pool ??
      new Pool(resolvePoolConfig(options.connectionString ?? process.env.DATABASE_URL));

    let storage: DrizzleStorage | undefined;

    try {
      const db = drizzle(pool, {
        schema: { projects, templates, agentRuns, approvals, snapshots, diffApprovals, entitlements },
      });
      storage = new DrizzleStorage(pool, db as StorageDatabase, migrationsFolder);
      await storage.initialize();
      return storage;
    } catch (error) {
      if (!options.pool) {
        await pool.end().catch(() => {
          /* ignore */
        });
      }
      throw error;
    }
  }

  private async initialize() {
    await this.ensurePgCrypto();
    await this.runMigrations();
    await this.seedTemplates();
  }

  private async ensurePgCrypto() {
    try {
      await this.pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    } catch (error) {
      // Some environments (like pg-mem) do not support extensions. Ignore failures there.
      if (process.env.NODE_ENV !== 'test') {
        console.warn('Unable to ensure pgcrypto extension:', (error as Error).message);
      }
    }
  }

  private async runMigrations() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
    } finally {
      client.release();
    }

    const files = (await readdir(this.migrationsFolder))
      .filter((file) => file.endsWith('.sql'))
      .sort();
    this.knownMigrations = files.map((file) => file.replace(/\.sql$/, ''));

    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      const alreadyApplied = await this.pool.query(
        'SELECT 1 FROM schema_migrations WHERE version = $1',
        [version]
      );
      if (alreadyApplied.rowCount && alreadyApplied.rowCount > 0) {
        this.appliedMigrations.add(version);
        continue;
      }

      const sql = await readFile(join(this.migrationsFolder, file), 'utf8');
      const migrationClient = await this.pool.connect();
      try {
        await migrationClient.query('BEGIN');
        await migrationClient.query(sql);
        await migrationClient.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        await migrationClient.query('COMMIT');
        this.appliedMigrations.add(version);
      } catch (error) {
        await migrationClient.query('ROLLBACK');
        throw new Error(`Migration ${version} failed: ${(error as Error).message}`);
      } finally {
        migrationClient.release();
      }
    }

    if (this.appliedMigrations.size !== this.knownMigrations.length) {
      const { rows }: { rows: { version: string }[] } = await this.pool.query(
        'SELECT version FROM schema_migrations ORDER BY version'
      );
      this.appliedMigrations = new Set(rows.map((row) => row.version));
    }
  }

  private async seedTemplates() {
    const defaultTemplates: InsertTemplate[] = [
      {
        id: 'next-14-tailwind',
        name: 'Next.js 14 + Tailwind',
        description: 'Modern web application with Next.js 14, TypeScript, and Tailwind CSS',
        type: 'web-next',
        thumbnail: null,
        techStack: ['Next.js 14', 'React', 'TypeScript', 'Tailwind CSS'],
      },
      {
        id: 'expo-51-mobile',
        name: 'Expo SDK 51',
        description: 'Cross-platform mobile app with Expo SDK 51 and React Native',
        type: 'mobile-expo',
        thumbnail: null,
        techStack: ['Expo SDK 51', 'React Native', 'TypeScript'],
      },
    ];

    await this.db
      .insert(templates)
      .values(defaultTemplates)
      .onConflictDoNothing({ target: templates.id });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private normalizeProject(project: Project): Project {
    return {
      ...project,
      description: project.description ?? null,
    };
  }

  async getProjects(): Promise<Project[]> {
    const rows = await this.db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));
    return rows.map((project) => this.normalizeProject(project));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await this.db.select().from(projects).where(eq(projects.id, id));
    return project ? this.normalizeProject(project) : undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await this.db
      .insert(projects)
      .values({
        ...insertProject,
        description: insertProject.description ?? null,
        status: insertProject.status ?? 'draft',
      })
      .returning();
    return this.normalizeProject(project);
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const [project] = await this.db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();
    return project ? this.normalizeProject(project) : undefined;
  }

  async getTemplates(): Promise<Template[]> {
    return this.db.select().from(templates);
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const [template] = await this.db.select().from(templates).where(eq(templates.id, id));
    return template;
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const [template] = await this.db
      .insert(templates)
      .values({
        ...insertTemplate,
        thumbnail: insertTemplate.thumbnail ?? null,
      })
      .onConflictDoUpdate({
        target: templates.id,
        set: {
          name: insertTemplate.name,
          description: insertTemplate.description,
          type: insertTemplate.type,
          thumbnail: insertTemplate.thumbnail ?? null,
          techStack: insertTemplate.techStack,
        },
      })
      .returning();
    return template;
  }

  async getAgentRuns(projectId: string): Promise<AgentRun[]> {
    return this.db
      .select()
      .from(agentRuns)
      .where(eq(agentRuns.projectId, projectId))
      .orderBy(desc(agentRuns.createdAt));
  }

  async getAgentRun(id: string): Promise<AgentRun | undefined> {
    const [agentRun] = await this.db.select().from(agentRuns).where(eq(agentRuns.id, id));
    return agentRun;
  }

  async createAgentRun(insertAgentRun: InsertAgentRun): Promise<AgentRun> {
    const [agentRun] = await this.db
      .insert(agentRuns)
      .values({
        ...insertAgentRun,
        status: insertAgentRun.status ?? 'running',
        input: insertAgentRun.input ?? null,
        output: insertAgentRun.output ?? null,
      })
      .returning();
    return agentRun;
  }

  async updateAgentRun(id: string, updates: Partial<AgentRun>): Promise<AgentRun | undefined> {
    const [agentRun] = await this.db
      .update(agentRuns)
      .set(updates)
      .where(eq(agentRuns.id, id))
      .returning();
    return agentRun;
  }

  async getApprovals(): Promise<Approval[]> {
    return this.db.select().from(approvals).orderBy(desc(approvals.createdAt));
  }

  async getApproval(id: string): Promise<Approval | undefined> {
    const [approval] = await this.db.select().from(approvals).where(eq(approvals.id, id));
    return approval;
  }

  async createApproval(insertApproval: InsertApproval): Promise<Approval> {
    const [approval] = await this.db
      .insert(approvals)
      .values({
        ...insertApproval,
        status: insertApproval.status ?? 'pending',
        comment: insertApproval.comment ?? null,
      })
      .returning();
    return approval;
  }

  async updateApproval(id: string, updates: Partial<Approval>): Promise<Approval | undefined> {
    const [approval] = await this.db
      .update(approvals)
      .set(updates)
      .where(eq(approvals.id, id))
      .returning();
    return approval;
  }

  async getSnapshots(): Promise<Snapshot[]> {
    return this.db.select().from(snapshots).orderBy(desc(snapshots.timestamp));
  }

  async getSnapshot(id: string): Promise<Snapshot | undefined> {
    const [snapshot] = await this.db.select().from(snapshots).where(eq(snapshots.id, id));
    return snapshot;
  }

  async createSnapshot(insertSnapshot: InsertSnapshot): Promise<Snapshot> {
    const [snapshot] = await this.db
      .insert(snapshots)
      .values({
        ...insertSnapshot,
        previousContent: insertSnapshot.previousContent ?? null,
      })
      .returning();
    return snapshot;
  }

  async deleteSnapshot(id: string): Promise<boolean> {
    const deleted = await this.db.delete(snapshots).where(eq(snapshots.id, id)).returning({ id: snapshots.id });
    return deleted.length > 0;
  }

  async getDiffApprovals(): Promise<DiffApproval[]> {
    return this.db.select().from(diffApprovals).orderBy(desc(diffApprovals.createdAt));
  }

  async getDiffApproval(id: string): Promise<DiffApproval | undefined> {
    const [approval] = await this.db.select().from(diffApprovals).where(eq(diffApprovals.id, id));
    return approval;
  }

  async createDiffApproval(insertDiffApproval: InsertDiffApproval): Promise<DiffApproval> {
    const now = new Date();
    const [approval] = await this.db
      .insert(diffApprovals)
      .values({
        ...insertDiffApproval,
        status: insertDiffApproval.status ?? 'pending',
        branchName: insertDiffApproval.branchName ?? null,
        prUrl: insertDiffApproval.prUrl ?? null,
        comment: insertDiffApproval.comment ?? null,
        submittedBy: insertDiffApproval.submittedBy ?? 'dev',
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return approval;
  }

  async updateDiffApproval(id: string, updates: Partial<DiffApproval>): Promise<DiffApproval | undefined> {
    const [approval] = await this.db
      .update(diffApprovals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(diffApprovals.id, id))
      .returning();
    return approval;
  }

  private normalizeEntitlement(entitlement: Entitlement): Entitlement {
    return {
      ...entitlement,
      coins: toCoins(entitlement.coins),
      subscriptions: toArray(entitlement.subscriptions),
      purchases: toArray(entitlement.purchases),
    } as Entitlement;
  }

  async getEntitlement(profileId: string): Promise<Entitlement | undefined> {
    const [entitlement] = await this.db
      .select()
      .from(entitlements)
      .where(eq(entitlements.profileId, profileId));
    return entitlement ? this.normalizeEntitlement(entitlement) : undefined;
  }

  async createOrUpdateEntitlement(insertEntitlement: InsertEntitlement): Promise<Entitlement> {
    const coinsPayload = insertEntitlement.coins ?? { balance: 0, total: 0 };
    const subscriptionsPayload = insertEntitlement.subscriptions ?? [];
    const purchasesPayload = insertEntitlement.purchases ?? [];
    const data: InsertEntitlement = {
      profileId: insertEntitlement.profileId,
      coins: coinsPayload as InsertEntitlement['coins'],
      subscriptions: subscriptionsPayload as InsertEntitlement['subscriptions'],
      purchases: purchasesPayload as InsertEntitlement['purchases'],
      updatedAt: new Date(),
    };

    const [entitlement] = await this.db
      .insert(entitlements)
      .values(data)
      .onConflictDoUpdate({
        target: entitlements.profileId,
        set: {
          coins: data.coins,
          subscriptions: data.subscriptions,
          purchases: data.purchases,
          updatedAt: data.updatedAt,
        },
      })
      .returning();

    return this.normalizeEntitlement(entitlement);
  }

  async creditCoins(profileId: string, amount: number, reason: string): Promise<Entitlement> {
    const existing = (await this.getEntitlement(profileId)) ?? {
      profileId,
      coins: { balance: 0, total: 0 },
      subscriptions: [],
      purchases: [],
      updatedAt: new Date(),
    };

    const coins = toCoins(existing.coins);
    const purchases = toArray(existing.purchases);
    const updatedCoins = {
      balance: (coins.balance ?? 0) + amount,
      total: (coins.total ?? 0) + amount,
    };
    const updatedPurchases = [
      ...purchases,
      { amount, reason, timestamp: new Date().toISOString() },
    ];

    return this.createOrUpdateEntitlement({
      profileId,
      coins: updatedCoins as InsertEntitlement['coins'],
      subscriptions: toArray(existing.subscriptions) as InsertEntitlement['subscriptions'],
      purchases: updatedPurchases as InsertEntitlement['purchases'],
    });
  }

  async debitCoins(profileId: string, amount: number, reason: string): Promise<Entitlement | undefined> {
    const existing = await this.getEntitlement(profileId);
    if (!existing) return undefined;

    const coins = toCoins(existing.coins);
    const newBalance = coins.balance - amount;
    if (newBalance < 0) return undefined;

    const purchases = toArray(existing.purchases);
    const updatedPurchases = [
      ...purchases,
      { amount: -amount, reason, timestamp: new Date().toISOString() },
    ];

    const entitlement = await this.createOrUpdateEntitlement({
      profileId,
      coins: { ...coins, balance: newBalance } as InsertEntitlement['coins'],
      subscriptions: toArray(existing.subscriptions) as InsertEntitlement['subscriptions'],
      purchases: updatedPurchases as InsertEntitlement['purchases'],
    });

    return entitlement;
  }

  async addSubscription(profileId: string, plan: string): Promise<Entitlement> {
    const existing = (await this.getEntitlement(profileId)) ?? {
      profileId,
      coins: { balance: 0, total: 0 },
      subscriptions: [],
      purchases: [],
      updatedAt: new Date(),
    };

    const subscriptions = toArray(existing.subscriptions);
    const updatedSubscriptions = [
      ...subscriptions,
      { plan, startedAt: new Date().toISOString(), status: 'active' },
    ];

    return this.createOrUpdateEntitlement({
      profileId,
      coins: toCoins(existing.coins) as InsertEntitlement['coins'],
      subscriptions: updatedSubscriptions as InsertEntitlement['subscriptions'],
      purchases: toArray(existing.purchases) as InsertEntitlement['purchases'],
    });
  }

  async addPurchase(profileId: string, purchase: any): Promise<Entitlement> {
    const existing = (await this.getEntitlement(profileId)) ?? {
      profileId,
      coins: { balance: 0, total: 0 },
      subscriptions: [],
      purchases: [],
      updatedAt: new Date(),
    };

    const purchases = toArray(existing.purchases);
    const updatedPurchases = [
      ...purchases,
      { ...purchase, timestamp: new Date().toISOString() },
    ];

    return this.createOrUpdateEntitlement({
      profileId,
      coins: toCoins(existing.coins) as InsertEntitlement['coins'],
      subscriptions: toArray(existing.subscriptions) as InsertEntitlement['subscriptions'],
      purchases: updatedPurchases as InsertEntitlement['purchases'],
    });
  }

  async healthCheck(): Promise<StorageHealth> {
    try {
      await this.pool.query('SELECT 1');
      const { rows }: { rows: { version: string }[] } = await this.pool.query(
        'SELECT version FROM schema_migrations ORDER BY version'
      );
      const applied = rows.map((row) => row.version);
      const pending = this.knownMigrations.filter((version) => !applied.includes(version));
      return { ok: true, migrations: { applied, pending } };
    } catch (error) {
      return {
        ok: false,
        migrations: { applied: Array.from(this.appliedMigrations), pending: this.knownMigrations },
        error: (error as Error).message,
      };
    }
  }
}

function resolvePoolConfig(connectionString?: string): PoolConfig {
  if (!connectionString) {
    throw new Error('DATABASE_URL must be set to use Drizzle storage');
  }

  const config: PoolConfig = {
    connectionString,
  };

  if (process.env.DATABASE_SSL === 'true') {
    config.ssl = {
      rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
    } as PoolConfig['ssl'];
  }

  return config;
}

export class MemStorage implements IStorage {
  private projects: Map<string, Project>;
  private templates: Map<string, Template>;
  private agentRuns: Map<string, AgentRun>;
  private approvals: Map<string, Approval>;
  private snapshots: Map<string, Snapshot>;
  private diffApprovals: Map<string, DiffApproval>;
  private entitlements: Map<string, Entitlement>;

  constructor() {
    this.projects = new Map();
    this.templates = new Map();
    this.agentRuns = new Map();
    this.approvals = new Map();
    this.snapshots = new Map();
    this.diffApprovals = new Map();
    this.entitlements = new Map();
    this.seedTemplates();
  }

  private seedTemplates() {
    const templates: Template[] = [
      {
        id: "next-14-tailwind",
        name: "Next.js 14 + Tailwind",
        description: "Modern web application with Next.js 14, TypeScript, and Tailwind CSS",
        type: "web-next",
        thumbnail: null,
        techStack: ["Next.js 14", "React", "TypeScript", "Tailwind CSS"],
      },
      {
        id: "expo-51-mobile",
        name: "Expo SDK 51",
        description: "Cross-platform mobile app with Expo SDK 51 and React Native",
        type: "mobile-expo",
        thumbnail: null,
        techStack: ["Expo SDK 51", "React Native", "TypeScript"],
      },
    ];

    templates.forEach((t) => this.templates.set(t.id, t));
  }

  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const project: Project = {
      ...insertProject,
      description: insertProject.description ?? null,
      status: insertProject.status ?? "draft",
      id,
      createdAt: new Date(),
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;

    const updated = { ...project, ...updates };
    this.projects.set(id, updated);
    return updated;
  }

  async getTemplates(): Promise<Template[]> {
    return Array.from(this.templates.values());
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    return this.templates.get(id);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const template: Template = {
      ...insertTemplate,
      thumbnail: insertTemplate.thumbnail ?? null,
    };
    this.templates.set(template.id, template);
    return template;
  }

  async getAgentRuns(projectId: string): Promise<AgentRun[]> {
    return Array.from(this.agentRuns.values())
      .filter((run) => run.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAgentRun(id: string): Promise<AgentRun | undefined> {
    return this.agentRuns.get(id);
  }

  async createAgentRun(insertAgentRun: InsertAgentRun): Promise<AgentRun> {
    const id = randomUUID();
    const agentRun: AgentRun = {
      ...insertAgentRun,
      status: insertAgentRun.status ?? "running",
      input: insertAgentRun.input ?? null,
      output: insertAgentRun.output ?? null,
      id,
      createdAt: new Date(),
    };
    this.agentRuns.set(id, agentRun);
    return agentRun;
  }

  async updateAgentRun(id: string, updates: Partial<AgentRun>): Promise<AgentRun | undefined> {
    const agentRun = this.agentRuns.get(id);
    if (!agentRun) return undefined;

    const updated = { ...agentRun, ...updates };
    this.agentRuns.set(id, updated);
    return updated;
  }

  async getApprovals(): Promise<Approval[]> {
    return Array.from(this.approvals.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getApproval(id: string): Promise<Approval | undefined> {
    return this.approvals.get(id);
  }

  async createApproval(insertApproval: InsertApproval): Promise<Approval> {
    const id = randomUUID();
    const approval: Approval = {
      ...insertApproval,
      status: insertApproval.status ?? "pending",
      comment: insertApproval.comment ?? null,
      id,
      createdAt: new Date(),
    };
    this.approvals.set(id, approval);
    return approval;
  }

  async updateApproval(id: string, updates: Partial<Approval>): Promise<Approval | undefined> {
    const approval = this.approvals.get(id);
    if (!approval) return undefined;

    const updated = { ...approval, ...updates };
    this.approvals.set(id, updated);
    return updated;
  }

  // Sprint 3: Snapshots
  async getSnapshots(): Promise<Snapshot[]> {
    return Array.from(this.snapshots.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getSnapshot(id: string): Promise<Snapshot | undefined> {
    return this.snapshots.get(id);
  }

  async createSnapshot(insertSnapshot: InsertSnapshot): Promise<Snapshot> {
    const snapshot: Snapshot = {
      ...insertSnapshot,
      previousContent: insertSnapshot.previousContent ?? null,
      timestamp: new Date(),
    };
    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  async deleteSnapshot(id: string): Promise<boolean> {
    return this.snapshots.delete(id);
  }

  // Sprint 3: Diff Approvals
  async getDiffApprovals(): Promise<DiffApproval[]> {
    return Array.from(this.diffApprovals.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getDiffApproval(id: string): Promise<DiffApproval | undefined> {
    return this.diffApprovals.get(id);
  }

  async createDiffApproval(insertDiffApproval: InsertDiffApproval): Promise<DiffApproval> {
    const id = randomUUID();
    const now = new Date();
    const approval: DiffApproval = {
      ...insertDiffApproval,
      status: insertDiffApproval.status ?? "pending",
      branchName: insertDiffApproval.branchName ?? null,
      prUrl: insertDiffApproval.prUrl ?? null,
      comment: insertDiffApproval.comment ?? null,
      submittedBy: insertDiffApproval.submittedBy ?? "dev",
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.diffApprovals.set(id, approval);
    return approval;
  }

  async updateDiffApproval(id: string, updates: Partial<DiffApproval>): Promise<DiffApproval | undefined> {
    const approval = this.diffApprovals.get(id);
    if (!approval) return undefined;

    const updated = { ...approval, ...updates, updatedAt: new Date() };
    this.diffApprovals.set(id, updated);
    return updated;
  }

  // Sprint 4 Add-ons: Entitlements
  async getEntitlement(profileId: string): Promise<Entitlement | undefined> {
    return this.entitlements.get(profileId);
  }

  async createOrUpdateEntitlement(insertEntitlement: InsertEntitlement): Promise<Entitlement> {
    const existing = this.entitlements.get(insertEntitlement.profileId);
    const entitlement: Entitlement = {
      ...insertEntitlement,
      coins: insertEntitlement.coins ?? { balance: 0, total: 0 },
      subscriptions: insertEntitlement.subscriptions ?? [],
      purchases: insertEntitlement.purchases ?? [],
      updatedAt: new Date(),
    };
    this.entitlements.set(insertEntitlement.profileId, entitlement);
    return entitlement;
  }

  async creditCoins(profileId: string, amount: number, reason: string): Promise<Entitlement> {
    let ent = this.entitlements.get(profileId);
    if (!ent) {
      ent = {
        profileId,
        coins: { balance: 0, total: 0 },
        subscriptions: [],
        purchases: [],
        updatedAt: new Date(),
      };
    }
    
    const coins = toCoins(ent.coins);
    const newCoins = {
      balance: coins.balance + amount,
      total: coins.total + amount,
    };

    const purchases = toArray(ent.purchases);
    const newPurchases = [...purchases, { amount, reason, timestamp: new Date().toISOString() }];
    
    const updated: Entitlement = {
      ...ent,
      coins: newCoins,
      purchases: newPurchases,
      updatedAt: new Date(),
    };
    
    this.entitlements.set(profileId, updated);
    return updated;
  }

  async debitCoins(profileId: string, amount: number, reason: string): Promise<Entitlement | undefined> {
    const ent = this.entitlements.get(profileId);
    if (!ent) return undefined;
    
    const coins = toCoins(ent.coins);
    const newBalance = coins.balance - amount;
    if (newBalance < 0) return undefined;

    const purchases = toArray(ent.purchases);
    const newPurchases = [...purchases, { amount: -amount, reason, timestamp: new Date().toISOString() }];
    
    const updated: Entitlement = {
      ...ent,
      coins: { ...coins, balance: newBalance },
      purchases: newPurchases,
      updatedAt: new Date(),
    };
    
    this.entitlements.set(profileId, updated);
    return updated;
  }

  async addSubscription(profileId: string, plan: string): Promise<Entitlement> {
    let ent = this.entitlements.get(profileId);
    if (!ent) {
      ent = {
        profileId,
        coins: { balance: 0, total: 0 },
        subscriptions: [],
        purchases: [],
        updatedAt: new Date(),
      };
    }
    
    const subscriptions = toArray(ent.subscriptions);
    const newSubscriptions = [...subscriptions, { plan, startedAt: new Date().toISOString(), status: 'active' }];
    
    const updated: Entitlement = {
      ...ent,
      subscriptions: newSubscriptions,
      updatedAt: new Date(),
    };
    
    this.entitlements.set(profileId, updated);
    return updated;
  }

  async addPurchase(profileId: string, purchase: any): Promise<Entitlement> {
    let ent = this.entitlements.get(profileId);
    if (!ent) {
      ent = {
        profileId,
        coins: { balance: 0, total: 0 },
        subscriptions: [],
        purchases: [],
        updatedAt: new Date(),
      };
    }
    
    const purchases = toArray(ent.purchases);
    const newPurchases = [...purchases, { ...purchase, timestamp: new Date().toISOString() }];
    
    const updated: Entitlement = {
      ...ent,
      purchases: newPurchases,
      updatedAt: new Date(),
    };
    
    this.entitlements.set(profileId, updated);
    return updated;
  }

  async healthCheck(): Promise<StorageHealth> {
    return { ok: true, migrations: { applied: [], pending: [] } };
  }
}

async function createStorageFromEnv(): Promise<IStorage> {
  if (process.env.DATABASE_URL) {
    try {
      const drizzleStorage = await DrizzleStorage.create();
      const health = await drizzleStorage.healthCheck();
      if (!health.ok) {
        throw new Error(health.error ?? 'Drizzle storage health check failed');
      }
      return drizzleStorage;
    } catch (error) {
      console.error(
        "Failed to initialize Drizzle storage, falling back to in-memory storage:",
        error
      );
      return new MemStorage();
    }
  }

  return new MemStorage();
}

function createStorageProxy(promise: Promise<IStorage>): IStorage {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === 'then') return undefined;
      return (...args: unknown[]) =>
        promise.then((instance) => {
          const value = instance[prop as keyof IStorage];
          if (typeof value === 'function') {
            return (value as (...args: unknown[]) => unknown).apply(instance, args);
          }
          return value;
        });
    },
  };

  const proxy = new Proxy<Record<string, unknown>>({}, handler);
  return proxy as unknown as IStorage;
}

const storagePromise = createStorageFromEnv();

export const storage: IStorage = createStorageProxy(storagePromise);
export const storageReady = storagePromise;
