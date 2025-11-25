import assert from "node:assert/strict";
import { IncomingMessage, ServerResponse } from "node:http";
import { Duplex } from "node:stream";

async function main() {
  process.env.NODE_ENV = "test";
  process.env.APP_URL = process.env.APP_URL || "https://app.test";
  process.env.COLLAB_PAY_SECRET = process.env.COLLAB_PAY_SECRET || "test-secret";
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-key";

  const { createApp } = await import("../index");
  const { default: billingRoutes } = await import("../routes/billing.js");
  const { errorHandler } = await import("../observability/index.js");

  const checkoutResponse = {
    checkout_url: "https://checkout.test/session",
    session_id: "sess_test_123",
  };

  const app = createApp();
  app.use("/api/billing", billingRoutes);
  app.use(errorHandler);

  const originalFetch = global.fetch;
  let capturedMetadata: Record<string, unknown> | undefined;

  try {
    global.fetch = async (_input: RequestInfo, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      capturedMetadata = body.metadata;

      return new Response(JSON.stringify(checkoutResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const requestPayload = {
      productKey: "PRO_MONTHLY",
      profileId: "profile_123",
      metadata: { existing: "value" },
      successUrl: "https://app.test/success",
      cancelUrl: "https://app.test/cancel",
    };
    const bodyString = JSON.stringify(requestPayload);

    const socket = new Duplex({
      read() {},
      write(_chunk, _encoding, callback) {
        callback();
      },
    });

    const req = new IncomingMessage(socket);
    req.method = "POST";
    req.url = "/api/billing/checkout";
    req.headers = {
      "content-type": "application/json",
      "content-length": Buffer.byteLength(bodyString).toString(),
      cookie: "ref_code=REFCODE123",
    } as IncomingMessage["headers"];
    req.push(bodyString);
    req.push(null);

    const res = new ServerResponse(req);
    const chunks: Buffer[] = [];

    const originalWrite = res.write.bind(res);
    res.write = ((chunk: any, ...args: any[]) => {
      if (typeof chunk === "string") {
        chunks.push(Buffer.from(chunk));
      } else if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      }
      return originalWrite(chunk, ...args);
    }) as typeof res.write;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      const fail = (err: unknown) => {
        if (!settled) {
          settled = true;
          reject(err);
        }
      };
      res.on("finish", finish);
      res.on("error", fail);
      app.handle(req, res, (err?: unknown) => {
        if (err) {
          fail(err);
        } else {
          finish();
        }
      });
    });

    socket.destroy();
    const responseBody = JSON.parse(Buffer.concat(chunks).toString() || "{}");

    assert.equal(res.statusCode, 200);
    assert.deepEqual(responseBody, {
      checkoutUrl: checkoutResponse.checkout_url,
      sessionId: checkoutResponse.session_id,
    });

    assert.ok(capturedMetadata, "Expected checkout metadata to be captured");
    assert.equal((capturedMetadata as Record<string, unknown>).ref_code, "REFCODE123");
    assert.equal((capturedMetadata as Record<string, unknown>).existing, "value");
    assert.equal((capturedMetadata as Record<string, unknown>).productKey, "PRO_MONTHLY");
    assert.equal((capturedMetadata as Record<string, unknown>).profileId, "profile_123");

    console.log("checkout metadata test passed");
  } finally {
    global.fetch = originalFetch;
  }
}

main().then(() => process.exit(0)).catch((error) => {
  console.error("Test failure", error);
  process.exit(1);
});
