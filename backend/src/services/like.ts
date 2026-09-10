import { prisma } from "../prisma/client";

export interface LikeOperationResult {
  liked: boolean;
  likesCount: number;
  threadId: number;
}

/**
 * Concurrency-safe like toggle for a thread.
 * Uses PostgreSQL advisory transaction locks to serialize concurrent toggles
 * for the same (userId, threadId) pair, preventing race conditions (P2002/P2025).
 * Returns the authoritative database state and like count.
 */
export const toggleLike = async (
  userId: number,
  threadId: number
): Promise<LikeOperationResult> => {
  return await prisma.$transaction(async (tx) => {
    // 1. Transaction-scoped PostgreSQL advisory lock on (userId, threadId)
    // Ensures concurrent requests for the exact same user and thread are safely serialized
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId}::int, ${threadId}::int);`;

    // 2. Authoritative check that the thread exists
    const thread = await tx.thread.findUnique({
      where: { id: threadId },
      select: { id: true },
    });

    if (!thread) {
      const err: any = new Error("Thread not found");
      err.statusCode = 404;
      throw err;
    }

    // 3. Check current state in serialized critical section
    const existing = await tx.like.findUnique({
      where: {
        user_id_thread_id: {
          user_id: userId,
          thread_id: threadId,
        },
      },
      select: { id: true },
    });

    let liked: boolean;

    if (existing) {
      await tx.like.delete({
        where: { id: existing.id },
      });
      liked = false;
    } else {
      await tx.like.create({
        data: {
          user_id: userId,
          thread_id: threadId,
        },
      });
      liked = true;
    }

    // 4. Calculate authoritative count inside the transaction
    const likesCount = await tx.like.count({
      where: { thread_id: threadId },
    });

    return { liked, likesCount, threadId };
  });
};

/**
 * Concurrency-safe and idempotent setLike (like or unlike).
 * Ensures the target state is reached idempotently without duplicate rows.
 */
export const setLike = async (
  userId: number,
  threadId: number,
  targetState: boolean
): Promise<LikeOperationResult> => {
  return await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId}::int, ${threadId}::int);`;

    const thread = await tx.thread.findUnique({
      where: { id: threadId },
      select: { id: true },
    });

    if (!thread) {
      const err: any = new Error("Thread not found");
      err.statusCode = 404;
      throw err;
    }

    const existing = await tx.like.findUnique({
      where: {
        user_id_thread_id: {
          user_id: userId,
          thread_id: threadId,
        },
      },
      select: { id: true },
    });

    if (targetState && !existing) {
      await tx.like.create({
        data: { user_id: userId, thread_id: threadId },
      });
    } else if (!targetState && existing) {
      await tx.like.delete({
        where: { id: existing.id },
      });
    }

    const likesCount = await tx.like.count({
      where: { thread_id: threadId },
    });

    return { liked: targetState, likesCount, threadId };
  });
};
