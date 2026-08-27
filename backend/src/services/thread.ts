import { prisma } from "../prisma/client";

export const createThread = async (userId: number, content: string, image: string[]) => {
  
  const thread = await prisma.thread.create({
    data: {
      content,
      image,
      created_by: userId,
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          full_name: true,
          photo_profile: true,
        },
      },
      _count: {
        select: {
          likes: true,
          replies: true,
        },
      },
      likes: {
        where: { user_id: userId },
        select: { id: true },
      },
    },
  });

  return {
    id: thread.id,
    content: thread.content,
    created_at: thread.created_at,
    image: thread.image ?? [],

    user: {
      id: thread.author.id,
      username: thread.author.username,
      name: thread.author.full_name,
      profile_picture: thread.author.photo_profile,
    },

    likes: thread._count.likes,
    reply: thread._count.replies,
    isLiked: thread.likes.length > 0,
  };
};

export const getThreads = async (user_id?: number, authorId?: number) => {
  return prisma.thread.findMany({
    where: authorId ? { created_by: authorId } : undefined,
    orderBy: { created_at: "desc" },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          full_name: true,
          photo_profile: true,
        },
      },
      _count: {
        select: {
          likes: true,
          replies: true,
        },
      },
      likes: user_id
        ? {
            where: { user_id: user_id },
            select: { id: true },
          }
        : false,
    },
  });
  
};

export const getThreadsFormatted = async (user_id?: number, createdBy?: number) => {
  const threads = await getThreads(user_id, createdBy);

  return threads.map((thread) => ({
    id: thread.id,
    content: thread.content,
    created_at: thread.created_at,
    image: thread.image ?? [],

    user: {
      id: thread.author.id,
      username: thread.author.username,
      name: thread.author.full_name,
      profile_picture: thread.author.photo_profile,
    },

    likes: thread._count.likes,
    reply: thread._count.replies,
    isLiked: user_id ? thread.likes.length > 0 : false,
  }));
};



export const getThreadsById = async (id: number, userId?: number) => {
  const thread = await prisma.thread.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          full_name: true,
          photo_profile: true,
        },
      },
      _count: {
        select: {
          replies: true,
          likes: true,
        },
      },
      likes: userId
        ? {
            where: { user_id: userId },
            select: { id: true },
          }
        : false,
    },
  });

  if (!thread) return null;

  return {
    id: thread.id,
    content: thread.content,
    image: thread.image ?? [],
    created_at: thread.created_at,
    user: {
      id: thread.author.id,
      username: thread.author.username,
      name: thread.author.full_name,
      profile_picture: thread.author.photo_profile,
    },

    likes: thread._count.likes,
    replies: thread._count.replies,
    isLiked: userId ? thread.likes.length > 0 : false,
  };
};




