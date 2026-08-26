import {prisma} from "../prisma/client";

export const getReplies = async () => {
  const replies = await prisma.reply.findMany({
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      content: true,
      created_at: true,
      thread_id: true,
      users: {
        select: {
          id: true,
          username: true,
          full_name: true,
          photo_profile: true,
        },
      },
    },
  });

  return replies.map((r) => ({
    id: r.id,
    thread_id: r.thread_id,
    content: r.content,
    created_at: r.created_at,
    user: {
      id: r.users.id,
      username: r.users.username,
      name: r.users.full_name,
      profile_picture: r.users.photo_profile,
    },
  }));
};

export const createReply = async (
  userId: number,
  threadId: number,
  content: string,
  image: string[]
) => {
  const r = await prisma.reply.create({
    data: {
      content,
      user_id: userId,
      thread_id: threadId,
      image,
    },
    select: {
      id: true,
      content: true,
      created_at: true,
      thread_id: true,
      image : true,
      users: {
        select: {
          id: true,
          username: true,
          full_name: true,
          photo_profile: true,
        },
      },
    },
  });
  
  return {
    id: r.id,
    thread_id: r.thread_id,
    content: r.content,
    created_at: r.created_at,
    image: r.image ?? [],
    user: {
      id: r.users.id,
      username: r.users.username, 
      name: r.users.full_name,
      profile_picture: r.users.photo_profile,
    },
  };
};


export const getRepliesByThreadId = async (threadId: number, userId?: number) => {
  const replies = await prisma.reply.findMany({
    where: { thread_id: threadId },
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      content: true,
      created_at: true,
      image:true,

      users: {
        select: {
          id: true,
          username: true,
          full_name: true,
          photo_profile: true,
        },
      },

      _count: {
        select: {
          replyLikes: true,
        },
      },
      
      replyLikes: userId
        ? {
            where: { user_id: userId },
            select: { id: true },
          }
        : false,
    },
  });

  return {
    replies: replies.map((r) => ({
      id: r.id,
      content: r.content,
      created_at: r.created_at,
      image: r.image,
      user: {
        id: r.users.id,
        username: r.users.username,
        name: r.users.full_name,
        profile_picture: r.users.photo_profile,
      },
      likes: r._count.replyLikes,
      isLiked: userId ? (Array.isArray(r.replyLikes) && r.replyLikes.length > 0) : false,
    })),
  };
};




export const toggleReplyLike = async (replyId: number, userId: number) => {
  // ambil thread_id untuk payload socket
  const reply = await prisma.reply.findUnique({
    where: { id: replyId },
    select: { id: true, thread_id: true },
  });

  if (!reply) {
    throw new Error("Reply not found");
  }

  const existing = await prisma.replyLike.findUnique({
    where: {
      user_id_reply_id: {
        user_id: userId,
        reply_id: replyId,
      },
    },
    select: { id: true },
  });

  let liked: boolean;

  if (existing) {
    await prisma.replyLike.delete({ where: { id: existing.id } });
    liked = false;
  } else {
    await prisma.replyLike.create({
      data: { reply_id: replyId, user_id: userId },
    });
    liked = true;
  }

  const likesCount = await prisma.replyLike.count({
    where: { reply_id: replyId },
  });

  return {
    replyId,
    threadId: reply.thread_id,
    likesCount,
    liked,
  };
};


