import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";

import { createProjectHandler } from "./routes/create-project";
import { storage } from "./storage";

type MockResponse = Pick<Response, "status" | "json"> & {
  statusCode: number;
  jsonBody?: unknown;
};

function createMockResponse(): MockResponse {
  return {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.jsonBody = payload;
      return this;
    },
  };
}

describe("createProjectHandler", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("returns 400 when payload fails validation", async () => {
    const req = { body: {} } as Partial<Request>;
    const res = createMockResponse();

    const createProjectMock = mock.method(storage, "createProject", async () => {
      throw new Error("should not be called");
    });

    await createProjectHandler(req as Request, res as unknown as Response);

    assert.strictEqual(res.statusCode, 400);
    assert.deepStrictEqual(res.jsonBody, {
      error: "Required",
      details: {
        name: ["Required"],
        type: ["Required"],
        templateId: ["Required"],
      },
    });
    assert.strictEqual(createProjectMock.mock.calls.length, 0);
  });

  it("returns 500 when storage.createProject throws", async () => {
    const req = {
      body: {
        name: "Test Project",
        type: "web",
        templateId: "next-14-tailwind",
      },
    } as Partial<Request>;
    const res = createMockResponse();

    const createProjectMock = mock.method(storage, "createProject", async () => {
      throw new Error("storage failure");
    });
    const consoleErrorMock = mock.method(console, "error", () => {});

    await createProjectHandler(req as Request, res as unknown as Response);

    assert.strictEqual(res.statusCode, 500);
    assert.deepStrictEqual(res.jsonBody, { error: "Failed to create project" });
    assert.strictEqual(createProjectMock.mock.calls.length, 1);
    assert.strictEqual(consoleErrorMock.mock.calls.length, 1);
  });
});
