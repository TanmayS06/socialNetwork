import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";

describe("Pulse API Health and Readiness Check", () => {
  it("GET /health returns status 200 with healthy status and pulse-api service", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "healthy",
      service: "pulse-api",
    });
  });

  it("GET /docs serves interactive Swagger API documentation", async () => {
    const res = await request(app).get("/docs/");
    expect([200, 301]).toContain(res.status);
  });
});
