import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'web' | 'mobile' | 'fullstack'
  templateId: text("template_id").notNull(),
  status: text("status").notNull().default('draft'), // 'draft' | 'building' | 'ready' | 'error'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const templates = pgTable("templates", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // 'web-next' | 'mobile-expo'
  thumbnail: text("thumbnail"),
  techStack: text("tech_stack").array().notNull(),
});

export const agentRuns = pgTable("agent_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  agentType: text("agent_type").notNull(), // 'planner' | 'implementer' | 'tester' | 'fixer'
  status: text("status").notNull().default('running'), // 'running' | 'completed' | 'failed'
  input: text("input"),
  output: text("output"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const approvals = pgTable("approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  agentRunId: varchar("agent_run_id").notNull().references(() => agentRuns.id),
  files: jsonb("files").notNull(), // Array of { path, before, after, status }
  status: text("status").notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates);

export const insertAgentRunSchema = createInsertSchema(agentRuns).omit({
  id: true,
  createdAt: true,
});

export const insertApprovalSchema = createInsertSchema(approvals).omit({
  id: true,
  createdAt: true,
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;

export type AgentRun = typeof agentRuns.$inferSelect;
export type InsertAgentRun = z.infer<typeof insertAgentRunSchema>;

export type Approval = typeof approvals.$inferSelect;
export type InsertApproval = z.infer<typeof insertApprovalSchema>;
