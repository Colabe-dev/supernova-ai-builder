import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { insertDiffApprovalSchema, insertSnapshotSchema } from "@shared/schema";
import simpleGit from "simple-git";
import fsp from "fs/promises";
import path from "path";
import jwt from "jsonwebtoken";
import pino from "pino";

const router = Router();
const git = simpleGit(process.cwd());
const logger = pino({ level: process.env.LOG_LEVEL || "info" });

// JWT middleware (dev bypass enabled)
function authGuard(req: Request, res: Response, next: Function) {
  //  Bypass auth when NODE_ENV is not production
  if (process.env.NODE_ENV !== "production") {
    (req as any).user = { username: "dev" };
    return next();
  }

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const secret = process.env.APP_JWT_SECRET || "dev-secret";
    const decoded = jwt.verify(token, secret);
    (req as any).user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Submit diffs for approval (creates snapshots)
router.post("/approvals/submit", authGuard, async (req: Request, res: Response) => {
  try {
    const { diffIds, comment } = req.body;
    
    if (!diffIds || !Array.isArray(diffIds) || diffIds.length === 0) {
      return res.status(400).json({ error: "diffIds array required" });
    }

    const user = (req as any).user;
    const snapshotIds: string[] = [];
    const ROOT = process.cwd();
    const diffsDir = path.join(ROOT, ".supernova", "diffs");

    // Create snapshots from diffs
    for (const diffId of diffIds) {
      try {
        // Read metadata
        const metaPath = path.join(diffsDir, `${diffId}.json`);
        const metadata = JSON.parse(await fsp.readFile(metaPath, "utf8"));
        
        // Read diff content
        const diffPath = path.join(diffsDir, `${diffId}.diff`);
        const diffContent = await fsp.readFile(diffPath, "utf8");
        
        // Extract previous and new content from diff
        const filePath = metadata.path;
        let previousContent = "";
        let newContent = "";
        
        try {
          // Try to read current file content
          const absPath = path.join(ROOT, filePath);
          newContent = await fsp.readFile(absPath, "utf8");
        } catch {}
        
        // Create snapshot
        const snapshot = await storage.createSnapshot({
          id: diffId,
          diffId,
          path: filePath,
          previousContent,
          newContent,
        });
        
        snapshotIds.push(snapshot.id);
      } catch (e: any) {
        logger.warn({ event: "snapshot.error", diffId, error: e.message });
      }
    }

    if (snapshotIds.length === 0) {
      return res.status(400).json({ error: "No valid snapshots created" });
    }

    // Create diff approval
    const approval = await storage.createDiffApproval({
      snapshotIds,
      comment: comment || null,
      submittedBy: user.username || "dev",
    });

    logger.info({ event: "approval.submitted", id: approval.id, snapshots: snapshotIds.length });
    
    return res.json(approval);
  } catch (e: any) {
    logger.error({ event: "approval.submit.error", error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

// List all diff approvals
router.get("/approvals", authGuard, async (req: Request, res: Response) => {
  try {
    const approvals = await storage.getDiffApprovals();
    return res.json(approvals);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Get single approval with snapshots
router.get("/approvals/:id", authGuard, async (req: Request, res: Response) => {
  try {
    const approval = await storage.getDiffApproval(req.params.id);
    if (!approval) {
      return res.status(404).json({ error: "Not found" });
    }

    // Fetch snapshots
    const snapshots = await Promise.all(
      approval.snapshotIds.map((id) => storage.getSnapshot(id))
    );

    return res.json({
      ...approval,
      snapshots: snapshots.filter(Boolean),
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Approve - create branch and optionally PR
router.post("/approvals/:id/approve", authGuard, async (req: Request, res: Response) => {
  try {
    const approval = await storage.getDiffApproval(req.params.id);
    if (!approval) {
      return res.status(404).json({ error: "Not found" });
    }

    if (approval.status !== "pending") {
      return res.status(400).json({ error: "Already processed" });
    }

    const user = (req as any).user;
    const timestamp = Date.now();
    const branchName = `approval/${timestamp}`;

    // Create git branch
    const mainBranch = process.env.GIT_MAIN || "main";
    await git.checkoutLocalBranch(branchName);

    // Get snapshots and apply changes
    const snapshots = await Promise.all(
      approval.snapshotIds.map((id) => storage.getSnapshot(id))
    );

    const ROOT = process.cwd();
    const validSnapshots = snapshots.filter(Boolean);
    
    for (const snapshot of validSnapshots) {
      if (!snapshot) continue;
      const filePath = path.join(ROOT, snapshot.path);
      await fsp.mkdir(path.dirname(filePath), { recursive: true });
      await fsp.writeFile(filePath, snapshot.newContent, "utf8");
    }

    // Commit changes
    await git.add(".");
    await git.commit(`Approval ${approval.id}: ${approval.comment || "Applied changes"}`);

    // Push branch
    const remote = process.env.GIT_REMOTE || "origin";
    try {
      await git.push(remote, branchName);
      logger.info({ event: "approval.branch.pushed", branch: branchName });
    } catch (e: any) {
      logger.warn({ event: "approval.push.error", error: e.message });
    }

    // Create PR if GitHub configured
    let prUrl = null;
    const prProvider = process.env.GIT_PR_PROVIDER;
    const repoSlug = process.env.GIT_REPO_SLUG;
    const githubToken = process.env.GITHUB_TOKEN;

    if (prProvider === "github" && repoSlug && githubToken) {
      try {
        const { fetch } = await import("undici");
        const [owner, repo] = repoSlug.split("/");
        
        const prBody = {
          title: `Approval ${approval.id}`,
          body: approval.comment || "Approved changes",
          head: branchName,
          base: mainBranch,
        };

        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/pulls`,
          {
            method: "POST",
            headers: {
              Authorization: `token ${githubToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(prBody),
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          prUrl = data.html_url;
          logger.info({ event: "approval.pr.created", url: prUrl });
        }
      } catch (e: any) {
        logger.warn({ event: "approval.pr.error", error: e.message });
      }
    }

    // Update approval status
    const updated = await storage.updateDiffApproval(req.params.id, {
      status: "approved",
      branchName,
      prUrl,
    });

    // Switch back to main
    await git.checkout(mainBranch);

    return res.json(updated);
  } catch (e: any) {
    logger.error({ event: "approval.approve.error", error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

// Reject - remove snapshots
router.post("/approvals/:id/reject", authGuard, async (req: Request, res: Response) => {
  try {
    const approval = await storage.getDiffApproval(req.params.id);
    if (!approval) {
      return res.status(404).json({ error: "Not found" });
    }

    if (approval.status !== "pending") {
      return res.status(400).json({ error: "Already processed" });
    }

    const { comment } = req.body;

    // Delete snapshots
    const ROOT = process.cwd();
    const diffsDir = path.join(ROOT, ".supernova", "diffs");
    
    for (const snapshotId of approval.snapshotIds) {
      await storage.deleteSnapshot(snapshotId);
      
      // Remove diff files
      try {
        await fsp.unlink(path.join(diffsDir, `${snapshotId}.diff`));
        await fsp.unlink(path.join(diffsDir, `${snapshotId}.json`));
      } catch {}
    }

    // Update approval status
    const updated = await storage.updateDiffApproval(req.params.id, {
      status: "rejected",
      comment: comment || approval.comment,
    });

    logger.info({ event: "approval.rejected", id: approval.id });

    return res.json(updated);
  } catch (e: any) {
    logger.error({ event: "approval.reject.error", error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

export default router;
