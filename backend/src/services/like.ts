import { prisma } from "../prisma/client";

export const toggleLike = async (userId: number, threadId: number) => {
  const existing = await prisma.like.findUnique({
    where: {
      user_id_thread_id: {
        user_id: userId,
        thread_id: threadId,
      },
    },
  });

  let liked: boolean;

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    liked = false;
  } else {
    await prisma.like.create({
      data: { user_id: userId, thread_id: threadId },
    });
    liked = true;
  }

  const likesCount = await prisma.like.count({
    where: { thread_id: threadId },
  });

  return { liked, likesCount, threadId };
};
