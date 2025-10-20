import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertAgentRunSchema } from "@shared/schema";
import { runAgent, generateMockCodeChanges } from "./agents";
import devRoutes from "./dev-routes";
import approvalsRoutes from "./approvals-routes";
import iapRoutes from "./iap/routes.real.js";
import entitlementsRoutes from "./entitlements/routes.db.js";
import dbHealthRoutes from "./routes/db.health.js";
import supabaseRoutes from "./routes/supabase.js";
import referralsRoutes from "./routes/referrals.js";
import billingRoutes from "./routes/billing.js";
import creditsRoutes from "./routes/credits.js";
import usageRoutes from "./routes/usage.js";
import roomsRoutes from "./routes/rooms.js";
import { initChatWS } from "./chat/ws";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount dev console routes
  app.use("/api", devRoutes);
  // Mount approvals routes (Sprint 3)
  app.use("/api", approvalsRoutes);
  // Mount IAP routes (Sprint 4)
  app.use("/api/iap", iapRoutes);
  // Mount entitlements routes (Sprint 4 Add-ons)
  app.use("/api", entitlementsRoutes);
  // Mount Supabase routes (Sprint 4 - Supabase Integration)
  app.use(dbHealthRoutes);
  app.use(supabaseRoutes);
  // Mount Referrals routes (Sprint 4 - Referral Tracking)
  app.use(referralsRoutes);
  // Mount Billing routes (Monetization v1)
  app.use("/api/billing", billingRoutes);
  // Mount Credits & Usage routes (Sprint A - Credits & Usage)
  app.use("/api/credits", creditsRoutes);
  app.use("/api/usage", usageRoutes);
  // Mount Rooms routes (Sprint C - Rooms & Agents)
  app.use("/api/rooms", roomsRoutes);
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      res.status(400).json({ error: "Invalid project data" });
    }
  });

  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.get("/api/projects/:id/agent-runs", async (req, res) => {
    try {
      const agentRuns = await storage.getAgentRuns(req.params.id);
      res.json(agentRuns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch agent runs" });
    }
  });

  app.post("/api/projects/:id/run-agent", async (req, res) => {
    try {
      const { id } = req.params;
      const { agentType } = req.body;

      if (!["planner", "implementer", "tester", "fixer"].includes(agentType)) {
        return res.status(400).json({ error: "Invalid agent type" });
      }

      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const agentRun = await storage.createAgentRun({
        projectId: id,
        agentType,
        status: "running",
        input: `Run ${agentType} for project: ${project.name}`,
        output: null,
      });

      res.status(201).json(agentRun);

      setImmediate(async () => {
        try {
          const context = `Project: ${project.name}\nType: ${project.type}\nDescription: ${project.description || "No description"}`;
          const input = agentType === "planner"
            ? "Create a detailed implementation plan for this project"
            : agentType === "implementer"
            ? "Generate initial project structure and key components"
            : agentType === "tester"
            ? "Create a comprehensive test plan for this project"
            : "Analyze potential issues and provide optimization recommendations";

          const output = await runAgent(agentType, input, context);

          await storage.updateAgentRun(agentRun.id, {
            status: "completed",
            output,
          });

          if (agentType === "implementer") {
            const files = generateMockCodeChanges(agentType, project.name);
            await storage.createApproval({
              projectId: id,
              agentRunId: agentRun.id,
              files: files as any,
              status: "pending",
              comment: null,
            });
          }
        } catch (error) {
          await storage.updateAgentRun(agentRun.id, {
            status: "failed",
            output: "Failed to execute agent: " + (error as Error).message,
          });
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to run agent" });
    }
  });

  app.get("/api/approvals", async (req, res) => {
    try {
      const approvals = await storage.getApprovals();
      res.json(approvals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch approvals" });
    }
  });

  app.get("/api/approvals/:id", async (req, res) => {
    try {
      const approval = await storage.getApproval(req.params.id);
      if (!approval) {
        return res.status(404).json({ error: "Approval not found" });
      }
      res.json(approval);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch approval" });
    }
  });

  app.patch("/api/approvals/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, comment } = req.body;

      if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const approval = await storage.updateApproval(id, { status, comment });
      if (!approval) {
        return res.status(404).json({ error: "Approval not found" });
      }

      res.json(approval);
    } catch (error) {
      res.status(500).json({ error: "Failed to update approval" });
    }
  });

  const httpServer = createServer(app);

  // Initialize WebSocket for live chat (Sprint 4)
  initChatWS(httpServer);

  return httpServer;
}
