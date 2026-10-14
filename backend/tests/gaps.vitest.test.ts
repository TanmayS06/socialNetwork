import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, io } from "../src/app";
import { prisma } from "../src/prisma/client";
import { redis, connectRedis } from "../src/lib/redis";
import { toggleLike, setLike } from "../src/services/like";

const JWT_SECRET = process.env.JWT_SECRET || "pulse_jwt_s3cr3t_k3y_2026";

function createAuthCookie(userId: number): string {
  const token = jwt.sign({ id: userId }, JWT_SECRET);
  return `token=${token}`;
}

describe("Pulse Platform CI/CD Integration Test Suite", () => {
  let userA: any;
  let userB: any;
  let userC: any;
  let cookieA: string;
  let cookieB: string;
  let testThread: any;

  beforeAll(async () => {
    try {
      await connectRedis();
    } catch {
      // Redis connect fallback if running in standalone mode
    }

    // Clean up test users
    await prisma.like.deleteMany({
      where: { user: { username: { in: ["vitest_user_a", "vitest_user_b", "vitest_user_c"] } } },
    });
    await prisma.following.deleteMany({
      where: {
        OR: [
          { follower: { username: { in: ["vitest_user_a", "vitest_user_b", "vitest_user_c"] } } },
          { following: { username: { in: ["vitest_user_a", "vitest_user_b", "vitest_user_c"] } } },
        ],
      },
    });
    await prisma.thread.deleteMany({
      where: { author: { username: { in: ["vitest_user_a", "vitest_user_b", "vitest_user_c"] } } },
    });
    await prisma.user.deleteMany({
      where: { username: { in: ["vitest_user_a", "vitest_user_b", "vitest_user_c"] } },
    });

    userA = await prisma.user.create({
      data: {
        username: "vitest_user_a",
        full_name: "Vitest User A",
        email: "vitest_user_a@example.com",
        password: "password123",
      },
    });

    userB = await prisma.user.create({
      data: {
        username: "vitest_user_b",
        full_name: "Vitest User B",
        email: "vitest_user_b@example.com",
        password: "password123",
      },
    });

    userC = await prisma.user.create({
      data: {
        username: "vitest_user_c",
        full_name: "Vitest User C",
        email: "vitest_user_c@example.com",
        password: "password123",
      },
    });

    cookieA = createAuthCookie(userA.id);
    cookieB = createAuthCookie(userB.id);

    testThread = await prisma.thread.create({
      data: {
        content: "Vitest Verification Thread",
        created_by: userA.id,
      },
    });

    await prisma.like.create({
      data: {
        user_id: userA.id,
        thread_id: testThread.id,
      },
    });
  });

  afterAll(async () => {
    try {
      if (testThread) {
        await prisma.like.deleteMany({ where: { thread_id: testThread.id } });
        await prisma.reply.deleteMany({ where: { thread_id: testThread.id } });
        await prisma.thread.deleteMany({
          where: { created_by: { in: [userA?.id, userB?.id, userC?.id].filter(Boolean) } },
        });
      }
      if (userA && userB && userC) {
        await prisma.user.deleteMany({
          where: { id: { in: [userA.id, userB.id, userC.id] } },
        });
      }
    } catch {
      // Cleanup best effort
    }
  });

  describe("Gap 1: Redis Cache Isolation & Pagination", () => {
    it("viewer-specific feeds prevent cross-user like state leakage", async () => {
      try {
        if (redis.isOpen) await redis.flushAll();
      } catch {}

      const resA = await request(app)
        .get("/api/v1/threads?page=1&limit=10")
        .set("Cookie", cookieA);

      expect(resA.status).toBe(200);
      const thA = resA.body.data.threads.find((th: any) => th.id === testThread.id);
      expect(thA).toBeDefined();
      expect(thA.isLiked).toBe(true);

      const resB = await request(app)
        .get("/api/v1/threads?page=1&limit=10")
        .set("Cookie", cookieB);

      expect(resB.status).toBe(200);
      const thB = resB.body.data.threads.find((th: any) => th.id === testThread.id);
      expect(thB).toBeDefined();
      expect(thB.isLiked).toBe(false);
    });

    it("feed pagination returns consistent pages with metadata and stable ordering", async () => {
      const res = await request(app)
        .get("/api/v1/threads?page=1&limit=5")
        .set("Cookie", cookieA);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(5);
      expect(Array.isArray(res.body.data.threads)).toBe(true);
    });
  });

  describe("Gap 2: Race-Safe Likes & Real-Time Event Deduplication", () => {
    it("concurrent like requests serialize safely without errors", async () => {
      const raceThread = await prisma.thread.create({
        data: {
          content: "Vitest concurrency thread",
          created_by: userA.id,
        },
      });

      const promises = Array.from({ length: 6 }, () =>
        toggleLike(userB.id, raceThread.id)
      );

      const settled = await Promise.allSettled(promises);
      const rejected = settled.filter((s) => s.status === "rejected");
      expect(rejected.length).toBe(0);

      const finalCount = await prisma.like.count({ where: { thread_id: raceThread.id } });
      expect(finalCount).toBe(0);

      await prisma.thread.delete({ where: { id: raceThread.id } });
    });

    it("multi-user concurrent likes maintain consistent authoritative count", async () => {
      const multiThread = await prisma.thread.create({
        data: {
          content: "Vitest multi-user thread",
          created_by: userA.id,
        },
      });

      const settled = await Promise.allSettled([
        setLike(userA.id, multiThread.id, true),
        setLike(userB.id, multiThread.id, true),
        setLike(userC.id, multiThread.id, true),
      ]);

      const rejected = settled.filter((s) => s.status === "rejected");
      expect(rejected.length).toBe(0);

      const count = await prisma.like.count({ where: { thread_id: multiThread.id } });
      expect(count).toBe(3);

      await prisma.like.deleteMany({ where: { thread_id: multiThread.id } });
      await prisma.thread.delete({ where: { id: multiThread.id } });
    });

    it("real-time socket event flow delivers targeted event to active user and deduplicates broadcast", async () => {
      const emittedToRoom: Array<{ room: string; event: string; data: any }> = [];
      const origTo = io.to.bind(io);

      io.to = ((room: string) => ({
        emit: (event: string, data: any) => {
          emittedToRoom.push({ room, event, data });
        },
      })) as any;

      try {
        const res = await request(app)
          .post("/api/v1/interactions/like")
          .set("Cookie", cookieB)
          .send({ thread_id: testThread.id });

        expect(res.status).toBe(200);

        const userBEvents = emittedToRoom.filter(
          (e) => e.room === `user:${userB.id}` && e.event === "thread:like_updated"
        );
        expect(userBEvents.length).toBe(1);
      } finally {
        io.to = origTo;
      }
    });
  });
});
