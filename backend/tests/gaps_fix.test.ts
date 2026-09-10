import test from "node:test";
import assert from "node:assert";
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

test("Gap 1 & Gap 2 Complete Regression and Validation Suite", async (t) => {
  await connectRedis();

  // Clean slate for test users
  await prisma.like.deleteMany({
    where: {
      user: {
        username: { in: ["gap_user_a", "gap_user_b", "gap_user_c"] },
      },
    },
  });
  await prisma.following.deleteMany({
    where: {
      OR: [
        { follower: { username: { in: ["gap_user_a", "gap_user_b", "gap_user_c"] } } },
        { following: { username: { in: ["gap_user_a", "gap_user_b", "gap_user_c"] } } },
      ],
    },
  });
  await prisma.thread.deleteMany({
    where: {
      author: {
        username: { in: ["gap_user_a", "gap_user_b", "gap_user_c"] },
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      username: { in: ["gap_user_a", "gap_user_b", "gap_user_c"] },
    },
  });

  const userA = await prisma.user.create({
    data: {
      username: "gap_user_a",
      full_name: "Gap User A",
      email: "gap_user_a@example.com",
      password: "password123",
    },
  });

  const userB = await prisma.user.create({
    data: {
      username: "gap_user_b",
      full_name: "Gap User B",
      email: "gap_user_b@example.com",
      password: "password123",
    },
  });

  const userC = await prisma.user.create({
    data: {
      username: "gap_user_c",
      full_name: "Gap User C",
      email: "gap_user_c@example.com",
      password: "password123",
    },
  });

  const cookieA = createAuthCookie(userA.id);
  const cookieB = createAuthCookie(userB.id);

  // Create a shared thread authored by userA
  const testThread = await prisma.thread.create({
    data: {
      content: "Main verification thread",
      created_by: userA.id,
    },
  });

  // User A likes testThread
  await prisma.like.create({
    data: {
      user_id: userA.id,
      thread_id: testThread.id,
    },
  });

  await t.test("GAP 1 FIX: Separate viewer-specific response data in Redis cache", async () => {
    await redis.flushAll();

    // 1. User A fetches feed -> cached under viewer User A key
    const resA = await request(app)
      .get("/api/v1/threads?page=1&limit=10")
      .set("Cookie", cookieA);

    assert.strictEqual(resA.status, 200);
    const thA = resA.body.data.threads.find((th: any) => th.id === testThread.id);
    assert.ok(thA, "Thread must be in feed for user A");
    assert.strictEqual(thA.isLiked, true, "User A must see isLiked = true");

    // 2. User B fetches feed -> hits cache or DB for viewer User B
    const resB = await request(app)
      .get("/api/v1/threads?page=1&limit=10")
      .set("Cookie", cookieB);

    assert.strictEqual(resB.status, 200);
    const thB = resB.body.data.threads.find((th: any) => th.id === testThread.id);
    assert.ok(thB, "Thread must be in feed for user B");
    assert.strictEqual(
      thB.isLiked,
      false,
      "CRITICAL: User B must see isLiked = false (NO cache leakage from User A)"
    );

    // 3. User A requests again -> cache hit with isLiked: true
    const resA2 = await request(app)
      .get("/api/v1/threads?page=1&limit=10")
      .set("Cookie", cookieA);
    assert.strictEqual(resA2.header["x-cache"], "HIT");
    const thA2 = resA2.body.data.threads.find((th: any) => th.id === testThread.id);
    assert.strictEqual(thA2.isLiked, true, "User A cached feed maintains isLiked = true");

    // 4. Thread detail endpoint isolation
    const resDetailA = await request(app)
      .get(`/api/v1/threads/${testThread.id}`)
      .set("Cookie", cookieA);
    assert.strictEqual(resDetailA.status, 200);
    assert.strictEqual(resDetailA.body.data.isLiked, true);

    const resDetailB = await request(app)
      .get(`/api/v1/threads/${testThread.id}`)
      .set("Cookie", cookieB);
    assert.strictEqual(resDetailB.status, 200);
    assert.strictEqual(
      resDetailB.body.data.isLiked,
      false,
      "Thread detail for User B must not leak User A like"
    );
  });

  await t.test("GAP 1 FIX: Page-based pagination with stable ordering and metadata", async () => {
    // Seed 6 pagination threads
    const seeded = [];
    for (let i = 1; i <= 6; i++) {
      const th = await prisma.thread.create({
        data: {
          content: `Pagination test thread ${i}`,
          created_by: userA.id,
        },
      });
      seeded.push(th);
    }

    // Request page 1 with limit 3
    const resPage1 = await request(app)
      .get("/api/v1/threads?page=1&limit=3")
      .set("Cookie", cookieA);

    assert.strictEqual(resPage1.status, 200);
    assert.strictEqual(resPage1.body.data.threads.length, 3, "Page 1 must return exactly 3 threads");
    assert.ok(resPage1.body.data.pagination, "Pagination metadata must be present");
    assert.strictEqual(resPage1.body.data.pagination.page, 1);
    assert.strictEqual(resPage1.body.data.pagination.limit, 3);
    assert.strictEqual(resPage1.body.data.pagination.hasNextPage, true);

    // Request page 2 with limit 3
    const resPage2 = await request(app)
      .get("/api/v1/threads?page=2&limit=3")
      .set("Cookie", cookieA);

    assert.strictEqual(resPage2.status, 200);
    assert.strictEqual(resPage2.body.data.threads.length, 3, "Page 2 must return exactly 3 threads");
    assert.strictEqual(resPage2.body.data.pagination.page, 2);

    // Ensure no overlap between page 1 and page 2 (stable ordering guarantee)
    const page1Ids = new Set(resPage1.body.data.threads.map((t: any) => t.id));
    for (const t of resPage2.body.data.threads) {
      assert.ok(!page1Ids.has(t.id), `Thread ${t.id} should not appear on both page 1 and page 2`);
    }

    // Clean up seeded threads
    await prisma.thread.deleteMany({
      where: { id: { in: seeded.map((s) => s.id) } },
    });
  });

  await t.test("GAP 1 FIX: Invalidation after likes, replies, follows, and post updates", async () => {
    // Ensure detail is cached
    await request(app)
      .get(`/api/v1/threads/${testThread.id}`)
      .set("Cookie", cookieB);

    // 1. User B likes testThread
    const likeRes = await request(app)
      .post("/api/v1/interactions/like")
      .set("Cookie", cookieB)
      .send({ thread_id: testThread.id });

    assert.strictEqual(likeRes.status, 200);

    // Fetch detail again: should be cache MISS / updated with User B isLiked = true
    const updatedDetailB = await request(app)
      .get(`/api/v1/threads/${testThread.id}`)
      .set("Cookie", cookieB);

    assert.strictEqual(updatedDetailB.body.data.isLiked, true, "User B should now be liked");
    assert.strictEqual(updatedDetailB.body.data.likes, 2, "Likes count should be 2");

    // 2. User B replies to testThread
    const replyRes = await request(app)
      .post("/api/v1/replies")
      .set("Cookie", cookieB)
      .send({ thread_id: testThread.id, content: "Great test post!" });

    assert.strictEqual(replyRes.status, 200);

    // 3. Post update (edit thread)
    const updateRes = await request(app)
      .patch(`/api/v1/threads/${testThread.id}`)
      .set("Cookie", cookieA)
      .send({ content: "Updated content for verification" });

    assert.strictEqual(updateRes.status, 200);

    // Detail fetch reflects updated content
    const updatedContent = await request(app)
      .get(`/api/v1/threads/${testThread.id}`)
      .set("Cookie", cookieA);

    assert.strictEqual(updatedContent.body.data.content, "Updated content for verification");

    // 4. Follow and unfollow invalidation
    const followRes = await request(app)
      .post("/api/v1/follows")
      .set("Cookie", cookieA)
      .send({ followed_user_id: userC.id });

    assert.strictEqual(followRes.status, 200);

    const unfollowRes = await request(app)
      .delete("/api/v1/follows")
      .set("Cookie", cookieA)
      .send({ followed_user_id: userC.id });

    assert.strictEqual(unfollowRes.status, 200);
  });

  await t.test("GAP 2 FIX: Race-safe concurrent like toggles on same user and thread", async () => {
    const raceThread = await prisma.thread.create({
      data: {
        content: "High concurrency race thread",
        created_by: userA.id,
      },
    });

    // 8 simultaneous toggleLike calls for userB
    const promises = Array.from({ length: 8 }, () =>
      toggleLike(userB.id, raceThread.id)
    );

    const settled = await Promise.allSettled(promises);

    // Verify ZERO rejections (no unique constraint P2002 or record not found P2025 errors)
    const errors = settled.filter((s) => s.status === "rejected");
    assert.strictEqual(errors.length, 0, "All 8 concurrent toggles must succeed without racing");

    // Authoritative count in DB must match parity: 8 toggles starting from unliked -> final state unliked
    const finalLikeInDb = await prisma.like.findUnique({
      where: {
        user_id_thread_id: {
          user_id: userB.id,
          thread_id: raceThread.id,
        },
      },
    });
    assert.strictEqual(finalLikeInDb, null, "8 toggles from unliked must leave it unliked");

    const finalCount = await prisma.like.count({ where: { thread_id: raceThread.id } });
    assert.strictEqual(finalCount, 0, "Authoritative count in DB must be 0");

    await prisma.thread.delete({ where: { id: raceThread.id } });
  });

  await t.test("GAP 2 FIX: Concurrent likes from multiple distinct users", async () => {
    const multiThread = await prisma.thread.create({
      data: {
        content: "Multi-user concurrency thread",
        created_by: userA.id,
      },
    });

    // Users A, B, C like the thread simultaneously
    const settled = await Promise.allSettled([
      setLike(userA.id, multiThread.id, true),
      setLike(userB.id, multiThread.id, true),
      setLike(userC.id, multiThread.id, true),
    ]);

    const errors = settled.filter((s) => s.status === "rejected");
    assert.strictEqual(errors.length, 0, "Multi-user concurrent likes must succeed");

    const dbCount = await prisma.like.count({ where: { thread_id: multiThread.id } });
    assert.strictEqual(dbCount, 3, "Authoritative DB count must be exactly 3");

    await prisma.like.deleteMany({ where: { thread_id: multiThread.id } });
    await prisma.thread.delete({ where: { id: multiThread.id } });
  });

  await t.test("GAP 2 FIX: Realtime event flow deduplication for socket clients", async () => {
    // Intercept socket emissions by spying on io.to and io.except
    const emittedToRoom: Array<{ room: string; event: string; data: any }> = [];
    const emittedExceptRoom: Array<{ room: string; event: string; data: any }> = [];

    const origTo = io.to.bind(io);
    const origExcept = io.except.bind(io);

    io.to = ((room: string) => {
      return {
        emit: (event: string, data: any) => {
          emittedToRoom.push({ room, event, data });
        },
      } as any;
    }) as any;

    io.except = ((room: string) => {
      return {
        emit: (event: string, data: any) => {
          emittedExceptRoom.push({ room, event, data });
        },
      } as any;
    }) as any;

    try {
      // Toggle like via API
      const res = await request(app)
        .post("/api/v1/interactions/like")
        .set("Cookie", cookieB)
        .send({ thread_id: testThread.id });

      assert.strictEqual(res.status, 200);

      // Verify that the active user room receives EXACTLY 1 event with isLiked
      const userBEvents = emittedToRoom.filter(
        (e) => e.room === `user:${userB.id}` && e.event === "thread:like_updated"
      );
      assert.strictEqual(userBEvents.length, 1, "Active user must receive exactly ONE targeted event");
      assert.strictEqual(typeof userBEvents[0].data.isLiked, "boolean");

      // Verify that io.except(`user:${userB.id}`) was used for broadcast
      const broadcastEvents = emittedExceptRoom.filter(
        (e) => e.room === `user:${userB.id}` && e.event === "thread:like_updated"
      );
      assert.strictEqual(broadcastEvents.length, 1, "Broadcast must exclude active user to prevent duplicates");
    } finally {
      io.to = origTo;
      io.except = origExcept;
    }
  });

  // Final cleanup
  await prisma.like.deleteMany({ where: { thread_id: testThread.id } });
  await prisma.reply.deleteMany({ where: { thread_id: testThread.id } });
  await prisma.thread.deleteMany({
    where: { created_by: { in: [userA.id, userB.id, userC.id] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [userA.id, userB.id, userC.id] } },
  });
});
