import test from "node:test";
import assert from "node:assert";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/app";
import { prisma } from "../src/prisma/client";
import { redis, connectRedis } from "../src/lib/redis";
import { toggleLike } from "../src/services/like";

const JWT_SECRET = process.env.JWT_SECRET || "pulse_jwt_s3cr3t_k3y_2026";

function createAuthCookie(userId: number): string {
  const token = jwt.sign({ id: userId }, JWT_SECRET);
  return `token=${token}`;
}

test("Regression Tests: Verify Bug Scenarios are Permanently Prevented", async (t) => {
  await connectRedis();

  const userA = await prisma.user.upsert({
    where: { username: "regress_user_a" },
    update: {},
    create: {
      username: "regress_user_a",
      full_name: "Regress User A",
      email: "regress_a@example.com",
      password: "password123",
    },
  });

  const userB = await prisma.user.upsert({
    where: { username: "regress_user_b" },
    update: {},
    create: {
      username: "regress_user_b",
      full_name: "Regress User B",
      email: "regress_b@example.com",
      password: "password123",
    },
  });

  const thread = await prisma.thread.create({
    data: {
      content: "Regression verification thread",
      created_by: userA.id,
    },
  });

  // User A likes thread
  await prisma.like.create({
    data: {
      user_id: userA.id,
      thread_id: thread.id,
    },
  });

  await t.test("Regression 1: No Redis cache leakage between different users", async () => {
    await redis.flushAll();

    const cookieA = createAuthCookie(userA.id);
    const cookieB = createAuthCookie(userB.id);

    // User A fetches feed - caches response under viewer A key
    const resA = await request(app)
      .get("/api/v1/threads?page=1&limit=10")
      .set("Cookie", cookieA);

    assert.strictEqual(resA.status, 200);
    const threadForA = resA.body.data.threads.find((th: any) => th.id === thread.id);
    assert.strictEqual(threadForA.isLiked, true, "User A must see isLiked = true");

    // User B fetches feed - must NOT get User A's cached isLiked = true
    const resB = await request(app)
      .get("/api/v1/threads?page=1&limit=10")
      .set("Cookie", cookieB);

    assert.strictEqual(resB.status, 200);
    const threadForB = resB.body.data.threads.find((th: any) => th.id === thread.id);
    assert.strictEqual(
      threadForB.isLiked,
      false,
      "Fixed: User B correctly sees isLiked = false"
    );
  });

  await t.test("Regression 2: Feed query enforces page-based pagination limits", async () => {
    const res = await request(app)
      .get("/api/v1/threads?page=1&limit=1")
      .set("Cookie", createAuthCookie(userA.id));

    assert.strictEqual(res.status, 200);
    assert.strictEqual(
      res.body.data.threads.length,
      1,
      "Fixed: Feed pagination enforces requested limit"
    );
    assert.ok(res.body.data.pagination);
    assert.strictEqual(res.body.data.pagination.limit, 1);
  });

  await t.test("Regression 3: Concurrent toggleLike calls do not throw unique constraint errors", async () => {
    const raceThread = await prisma.thread.create({
      data: {
        content: "Concurrency regression thread",
        created_by: userA.id,
      },
    });

    // 4 simultaneous toggle calls from userB
    const results = await Promise.allSettled([
      toggleLike(userB.id, raceThread.id),
      toggleLike(userB.id, raceThread.id),
      toggleLike(userB.id, raceThread.id),
      toggleLike(userB.id, raceThread.id),
    ]);

    const rejected = results.filter((r) => r.status === "rejected");
    assert.strictEqual(
      rejected.length,
      0,
      "Fixed: Zero failures during concurrent toggle calls"
    );

    await prisma.like.deleteMany({ where: { thread_id: raceThread.id } });
    await prisma.thread.delete({ where: { id: raceThread.id } });
  });

  // Cleanup
  await prisma.like.deleteMany({ where: { thread_id: thread.id } });
  await prisma.thread.delete({ where: { id: thread.id } });
  await prisma.user.deleteMany({
    where: { id: { in: [userA.id, userB.id] } },
  });
});
