import {
  type Project,
  type InsertProject,
  type Template,
  type InsertTemplate,
  type AgentRun,
  type InsertAgentRun,
  type Approval,
  type InsertApproval,
} from "@shared/schema";
import { randomUUID } from "crypto";

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
}

export class MemStorage implements IStorage {
  private projects: Map<string, Project>;
  private templates: Map<string, Template>;
  private agentRuns: Map<string, AgentRun>;
  private approvals: Map<string, Approval>;

  constructor() {
    this.projects = new Map();
    this.templates = new Map();
    this.agentRuns = new Map();
    this.approvals = new Map();
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
}

export const storage = new MemStorage();
