import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "http";
import { createResponseLoggingMiddleware } from "../observability/response-logger";

async function startServer(app: express.Express): Promise<{ server: Server; port: number; }> {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") {
        resolve({ server, port: address.port });
      }
    });
  });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("logs payload snapshot for JSON responses", async (t) => {
  const logLines: string[] = [];
  const app = express();

  app.use(createResponseLoggingMiddleware((message) => logLines.push(message)));
  app.get("/api/example-json", (_req, res) => {
    res.json({ ok: true, route: "json" });
  });

  const { server, port } = await startServer(app);
  t.after(() => server.close());

  const response = await fetch(`http://127.0.0.1:${port}/api/example-json`);
  assert.equal(response.status, 200);
  await response.json();

  await delay(10);

  assert.ok(
    logLines.some((line) => line.includes("/api/example-json") && line.includes("{\"ok\":true")),
    "Expected log line to include JSON payload snapshot",
  );
});

test("logs payload snapshot for text responses", async (t) => {
  const logLines: string[] = [];
  const app = express();

  app.use(createResponseLoggingMiddleware((message) => logLines.push(message)));
  app.get("/api/example-text", (_req, res) => {
    res.send("plain text payload");
  });

  const { server, port } = await startServer(app);
  t.after(() => server.close());

  const response = await fetch(`http://127.0.0.1:${port}/api/example-text`);
  assert.equal(response.status, 200);
  await response.text();

  await delay(10);

  assert.ok(
    logLines.some((line) => line.includes("/api/example-text") && line.includes("plain text payload")),
    "Expected log line to include text payload snapshot",
  );
});
