import test from "node:test";
import assert from "node:assert";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, io } from "../src/app";
import { prisma } from "../src/prisma/client";
import { connectRedis } from "../src/lib/redis";
import { toggleLike, setLike } from "../src/services/like";

const JWT_SECRET = process.env.JWT_SECRET || "pulse_jwt_s3cr3t_k3y_2026";

function createAuthCookie(userId: number): string {
  const token = jwt.sign({ id: userId }, JWT_SECRET);
  return `token=${token}`;
}

test("Simultaneous Like/Unlike and Socket Event Deduplication Regression Tests", async (t) => {
  await connectRedis();

  const user1 = await prisma.user.create({
    data: {
      username: "socket_test_user_1",
      full_name: "Socket User 1",
      email: "socket_user_1@example.com",
      password: "password123",
    },
  });

  const user2 = await prisma.user.create({
    data: {
      username: "socket_test_user_2",
      full_name: "Socket User 2",
      email: "socket_user_2@example.com",
      password: "password123",
    },
  });

  const thread = await prisma.thread.create({
    data: {
      content: "Realtime socket race test thread",
      created_by: user1.id,
    },
  });

  await t.test("Simultaneous like and unlike requests from different users maintain exact counts", async () => {
    // 6 concurrent requests: 3 users liking, 3 toggles
    const requests = [
      setLike(user1.id, thread.id, true),
      setLike(user2.id, thread.id, true),
      toggleLike(user1.id, thread.id),
      toggleLike(user2.id, thread.id),
    ];

    const results = await Promise.allSettled(requests);
    const rejected = results.filter((r) => r.status === "rejected");
    assert.strictEqual(rejected.length, 0, "No concurrent requests should fail");

    // Check count in DB matches actual rows in DB
    const [dbRowCount, countQuery] = await Promise.all([
      prisma.like.count({ where: { thread_id: thread.id } }),
      prisma.like.findMany({ where: { thread_id: thread.id } }),
    ]);

    assert.strictEqual(
      dbRowCount,
      countQuery.length,
      "Authoritative count must exactly match actual like rows"
    );
  });

  await t.test("No duplicate socket events emitted on like toggle", async () => {
    const receivedByUser1: any[] = [];
    const receivedByOthers: any[] = [];

    const origTo = io.to.bind(io);
    const origExcept = io.except.bind(io);

    io.to = ((room: string) => ({
      emit: (event: string, payload: any) => {
        if (room === `user:${user1.id}`) {
          receivedByUser1.push({ room, event, payload });
        }
      },
    })) as any;

    io.except = ((room: string) => ({
      emit: (event: string, payload: any) => {
        if (room === `user:${user1.id}`) {
          receivedByOthers.push({ room, event, payload });
        }
      },
    })) as any;

    try {
      const res = await request(app)
        .post("/api/v1/interactions/like")
        .set("Cookie", createAuthCookie(user1.id))
        .send({ thread_id: thread.id });

      assert.strictEqual(res.status, 200);

      // The liking user must receive exactly ONE targeted event with authoritative isLiked
      assert.strictEqual(
        receivedByUser1.length,
        1,
        "User 1 must not receive duplicate events"
      );
      assert.strictEqual(typeof receivedByUser1[0].payload.isLiked, "boolean");

      // Others must receive exactly ONE broadcast event without the personal isLiked state
      assert.strictEqual(
        receivedByOthers.length,
        1,
        "Others must receive exactly ONE broadcast event"
      );
      assert.strictEqual(
        receivedByOthers[0].payload.isLiked,
        undefined,
        "Broadcast event to others must not contain viewer isLiked"
      );
    } finally {
      io.to = origTo;
      io.except = origExcept;
    }
  });

  // Cleanup
  await prisma.like.deleteMany({ where: { thread_id: thread.id } });
  await prisma.thread.delete({ where: { id: thread.id } });
  await prisma.user.deleteMany({
    where: { id: { in: [user1.id, user2.id] } },
  });
});
