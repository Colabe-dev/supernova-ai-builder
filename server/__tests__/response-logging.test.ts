import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
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
    const respond = res.json;
    respond({ ok: true, route: "json" });
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
    const send = res.send;
    send("plain text payload");
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

test("skips payload snapshots for buffers and streams", async (t) => {
  const logLines: string[] = [];
  const app = express();

  app.use(createResponseLoggingMiddleware((message) => logLines.push(message)));
  app.get("/api/buffer", (_req, res) => {
    const send = res.send;
    send(Buffer.from("binary-payload"));
  });

  app.get("/api/stream", (_req, res) => {
    const stream = Readable.from(["stream-data"]);
    res.type("text/plain");
    stream.pipe(res);
  });

  const { server, port } = await startServer(app);
  t.after(() => server.close());

  const bufferResponse = await fetch(`http://127.0.0.1:${port}/api/buffer`);
  assert.equal(bufferResponse.status, 200);
  await bufferResponse.arrayBuffer();

  const streamResponse = await fetch(`http://127.0.0.1:${port}/api/stream`);
  assert.equal(streamResponse.status, 200);
  await streamResponse.text();

  await delay(10);

  assert.ok(
    logLines.some((line) =>
      line.includes("/api/buffer") && !line.includes("binary-payload") && !line.includes("::"),
    ),
    "Expected buffer response to log without payload snapshot",
  );

  assert.ok(
    logLines.some((line) =>
      line.includes("/api/stream") && !line.includes("stream-data") && !line.includes("::"),
    ),
    "Expected stream response to log without payload snapshot",
  );
});
