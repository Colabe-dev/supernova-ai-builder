import { Router, Request, Response, NextFunction } from "express";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import crypto from "crypto";
import { exec } from "child_process";
import pino from "pino";
import { validateTokens } from "./tokens-schema";

const router = Router();
const ROOT = process.cwd();
const WHITELIST = new Set(["client/src", "server", "shared", "public"]);

// Audit logger with sensitive data redaction
const logger = pino({
  redact: ["req.headers.authorization", "req.headers.cookie"],
  level: process.env.LOG_LEVEL || "info",
});

// Hardened guards: require BOTH development mode AND explicit flags
const isDev = () => process.env.NODE_ENV !== "production";
const enabledFS = () => isDev() && process.env.DEV_FS_ENABLE === "true";
const enabledTerminal = () => isDev() && process.env.DEV_TERMINAL_ENABLE === "true";

// Guard middleware factory
const guard = (flag: string) => (req: Request, res: Response, next: NextFunction) => {
  const enabled = flag === "DEV_FS_ENABLE" ? enabledFS() : enabledTerminal();
  if (!enabled) {
    logger.warn({ event: "guard.denied", flag, path: req.path });
    return res.status(403).json({ error: "disabled" });
  }
  next();
};

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
router.get("/dev/fs", guard("DEV_FS_ENABLE"), async (req: Request, res: Response) => {

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

// File system - write file and record diff with metadata
router.post("/dev/fs", guard("DEV_FS_ENABLE"), async (req: Request, res: Response) => {
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

    // Record diff with metadata
    const diffsDir = path.join(ROOT, ".supernova", "diffs");
    await fsp.mkdir(diffsDir, { recursive: true });
    const id = `edit-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const diff = makeUnifiedDiff(relPath, previousContent, content ?? "");
    await fsp.writeFile(path.join(diffsDir, `${id}.diff`), diff, "utf8");

    // Save metadata sidecar
    const metadata = {
      id,
      path: relPath,
      ts: Date.now(),
      user: "dev", // Will wire auth later
    };
    await fsp.writeFile(
      path.join(diffsDir, `${id}.json`),
      JSON.stringify(metadata, null, 2),
      "utf8"
    );

    // Audit log
    logger.info({ event: "file.save", path: relPath, id });

    // Broadcast to preview via SSE
    previewBroadcast({ type: "fileSaved", path: relPath, id });

    return res.json({ ok: true, id });
  } catch (e: any) {
    logger.error({ event: "file.save.error", path: relPath, error: e.message });
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

// SSE for live preview ping with heartbeat
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

// SSE heartbeat to prevent dead connections
setInterval(() => {
  Array.from(sseClients).forEach((client) => {
    try {
      client.write("event: ping\ndata: {}\n\n");
    } catch {
      sseClients.delete(client);
    }
  });
}, 30_000);

// Terminal - whitelist commands only
const ALLOWED_COMMANDS = new Set([
  "node -v",
  "npm -v",
  "npm run build",
  "npm run lint",
  "echo ok",
]);

router.post("/dev/terminal", guard("DEV_TERMINAL_ENABLE"), async (req: Request, res: Response) => {
  const { cmd } = req.body || {};
  if (!ALLOWED_COMMANDS.has(cmd)) {
    logger.warn({ event: "terminal.denied", cmd });
    return res.status(400).json({ error: "Command not allowed" });
  }

  // Audit log (whitelisted but still logged)
  logger.info({ event: "terminal.exec", cmd });

  exec(cmd, { timeout: 60_000 }, (err, stdout, stderr) => {
    if (err) {
      logger.error({ event: "terminal.error", cmd, error: err.message });
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
  // Validate token schema
  if (!validateTokens(req.body)) {
    logger.warn({ event: "tokens.invalid", errors: validateTokens.errors });
    return res.status(400).json({
      error: "Invalid tokens",
      details: validateTokens.errors,
    });
  }

  await fsp.writeFile(TOKENS_PATH, JSON.stringify(req.body, null, 2), "utf8");
  logger.info({ event: "tokens.updated" });
  previewBroadcast({ type: "tokensUpdated" });
  res.json({ ok: true });
});

// Diff list - load from metadata
router.get("/diff/list", async (_req: Request, res: Response) => {
  try {
    const dir = path.join(ROOT, ".supernova", "diffs");
    await fsp.mkdir(dir, { recursive: true });
    const files = await fsp.readdir(dir);
    const items = await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (f) => {
          try {
            const metaPath = path.join(dir, f);
            const diffPath = path.join(dir, f.replace(".json", ".diff"));
            const meta = JSON.parse(await fsp.readFile(metaPath, "utf8"));
            const diff = await fsp.readFile(diffPath, "utf8");
            return {
              ...meta,
              title: `Change ${meta.path}`,
              diff,
            };
          } catch {
            return null;
          }
        })
    );
    // Filter nulls and sort by timestamp descending
    const validItems = items.filter((item) => item !== null);
    validItems.sort((a: any, b: any) => b.ts - a.ts);
    res.json({ items: validItems });
  } catch {
    res.json({ items: [] });
  }
});

// Diff revert - restore previous content
router.post("/diff/revert", async (req: Request, res: Response) => {
  const { id } = req.body || {};
  if (!id) {
    return res.status(400).json({ error: "id required" });
  }

  try {
    const diffsDir = path.join(ROOT, ".supernova", "diffs");
    const metaPath = path.join(diffsDir, `${id}.json`);
    const diffPath = path.join(diffsDir, `${id}.diff`);

    const meta = JSON.parse(await fsp.readFile(metaPath, "utf8"));
    const diff = await fsp.readFile(diffPath, "utf8");

    // Simple revert: extract lines that were removed (start with "- ")
    const lines = diff.split("\n");
    const restored = lines
      .filter((l) => l.startsWith("- "))
      .map((l) => l.slice(2))
      .join("\n");

    const filePath = path.join(ROOT, meta.path);
    await fsp.writeFile(filePath, restored, "utf8");

    logger.info({ event: "diff.revert", id, path: meta.path });
    res.json({ ok: true });
  } catch (e: any) {
    logger.error({ event: "diff.revert.error", id, error: e.message });
    res.status(400).json({ error: e.message });
  }
});

export default router;
