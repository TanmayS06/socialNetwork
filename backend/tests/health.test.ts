import test from "node:test";
import assert from "node:assert";
import request from "supertest";
import { app } from "../src/app";

test("Health Check and System Readiness API", async (t) => {
  await t.test("GET /health returns healthy status and pulse-api service identifier", async () => {
    const res = await request(app).get("/health");
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body, {
      status: "healthy",
      service: "pulse-api",
    });
  });

  await t.test("GET /docs returns 200 or 301 for Swagger documentation", async () => {
    const res = await request(app).get("/docs/");
    assert.ok(res.status === 200 || res.status === 301);
  });
});
