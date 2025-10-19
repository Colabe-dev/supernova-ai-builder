import { Router, Request, Response } from "express";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import crypto from "crypto";
import { exec } from "child_process";

const router = Router();
const ROOT = process.cwd();
const WHITELIST = new Set(["client/src", "server", "shared", "public"]);

const enabledFS = () => process.env.DEV_FS_ENABLE === "true";
const enabledTerminal = () => process.env.DEV_TERMINAL_ENABLE === "true";

function assertAllowed(absPath: string) {
  const rel = path.relative(ROOT, absPath);
  if (rel.startsWith("..")) {
    throw new Error("Path escape attempt");
  }
  const topDir = rel.split(path.sep)[0];
  const isAllowed = Array.from(WHITELIST).some(wl => rel.startsWith(wl));
  if (!isAllowed) {
    throw new Error(`Path not in whitelist: ${rel}`);
  }
}

// File system - list directory or read file
router.get("/dev/fs", async (req: Request, res: Response) => {
  if (!enabledFS()) {
    return res.status(403).json({ error: "File system access disabled" });
  }

  const requestedPath = (req.query.path as string) || "client/src";
  const absPath = path.join(ROOT, requestedPath);

  try {
    assertAllowed(absPath);
    const stat = await fsp.stat(absPath);

    if (stat.isDirectory()) {
      const entries = await fsp.readdir(absPath);
      const list = await Promise.all(
        entries.map(async (name) => {
          const entryPath = path.join(absPath, name);
          const entryStat = await fsp.stat(entryPath);
          return {
            name,
            dir: entryStat.isDirectory(),
            size: entryStat.size,
          };
        })
      );
      return res.json({ path: requestedPath, entries: list });
    } else {
      const content = await fsp.readFile(absPath, "utf8");
      return res.json({ path: requestedPath, content });
    }
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
});

// File system - write file and record diff
router.post("/dev/fs", async (req: Request, res: Response) => {
  if (!enabledFS()) {
    return res.status(403).json({ error: "File system access disabled" });
  }

  const { path: relPath, content } = req.body || {};
  if (!relPath) {
    return res.status(400).json({ error: "path required" });
  }

  const absPath = path.join(ROOT, relPath);

  try {
    assertAllowed(absPath);

    let previousContent = "";
    try {
      previousContent = await fsp.readFile(absPath, "utf8");
    } catch {}

    await fsp.mkdir(path.dirname(absPath), { recursive: true });
    await fsp.writeFile(absPath, content ?? "", "utf8");

    // Record diff
    const diffsDir = path.join(ROOT, ".supernova", "diffs");
    await fsp.mkdir(diffsDir, { recursive: true });
    const id = `edit-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const diff = makeUnifiedDiff(relPath, previousContent, content ?? "");
    await fsp.writeFile(path.join(diffsDir, `${id}.diff`), diff, "utf8");

    // Broadcast to preview via SSE
    previewBroadcast({ type: "fileSaved", path: relPath, id });

    return res.json({ ok: true, id });
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
});

function makeUnifiedDiff(file: string, a: string, b: string): string {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  let output = `--- a/${file}\n+++ b/${file}\n`;
  const maxLines = Math.max(aLines.length, bLines.length);

  for (let i = 0; i < maxLines; i++) {
    const aLine = aLines[i];
    const bLine = bLines[i];
    if (aLine === bLine) continue;
    if (aLine !== undefined) output += `- ${aLine}\n`;
    if (bLine !== undefined) output += `+ ${bLine}\n`;
  }
  return output;
}

// SSE for live preview ping
const sseClients = new Set<Response>();

router.get("/dev/preview/stream", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  sseClients.add(res);
  req.on("close", () => {
    sseClients.delete(res);
  });
});

function previewBroadcast(payload: any) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  Array.from(sseClients).forEach((client) => {
    client.write(data);
  });
}

// Terminal - whitelist commands only
const ALLOWED_COMMANDS = new Set([
  "node -v",
  "npm -v",
  "npm run build",
  "npm run lint",
  "echo ok",
]);

router.post("/dev/terminal", async (req: Request, res: Response) => {
  if (!enabledTerminal()) {
    return res.status(403).json({ error: "Terminal access disabled" });
  }

  const { cmd } = req.body || {};
  if (!ALLOWED_COMMANDS.has(cmd)) {
    return res.status(400).json({ error: "Command not allowed" });
  }

  exec(cmd, { timeout: 60_000 }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({
        ok: false,
        error: err.message,
        stdout,
        stderr,
      });
    }
    res.json({ ok: true, stdout, stderr });
  });
});

// Design tokens
const TOKENS_PATH = path.join(ROOT, "design.tokens.json");

router.get("/design/tokens", async (_req: Request, res: Response) => {
  try {
    const data = await fsp.readFile(TOKENS_PATH, "utf8");
    return res.json(JSON.parse(data));
  } catch {
    return res.json({
      theme: {
        primary: "#a855f7",
        background: "#0f0f0f",
        text: "#ffffff",
        accent: "#ec4899",
      },
    });
  }
});

router.post("/design/tokens", async (req: Request, res: Response) => {
  await fsp.writeFile(TOKENS_PATH, JSON.stringify(req.body || {}, null, 2), "utf8");
  previewBroadcast({ type: "tokensUpdated" });
  res.json({ ok: true });
});

// Diff list
router.get("/diff/list", async (_req: Request, res: Response) => {
  try {
    const dir = path.join(ROOT, ".supernova", "diffs");
    await fsp.mkdir(dir, { recursive: true });
    const files = await fsp.readdir(dir);
    const items = await Promise.all(
      files
        .filter((f) => f.endsWith(".diff"))
        .map(async (f) => {
          const diffContent = await fsp.readFile(path.join(dir, f), "utf8");
          return {
            id: f.replace(".diff", ""),
            title: `Change ${f}`,
            diff: diffContent,
            timestamp: f.split("-")[1] ? parseInt(f.split("-")[1]) : Date.now(),
          };
        })
    );
    // Sort by timestamp descending
    items.sort((a, b) => b.timestamp - a.timestamp);
    res.json({ items });
  } catch {
    res.json({ items: [] });
  }
});

export default router;
