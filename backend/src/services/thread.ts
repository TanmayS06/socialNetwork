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

export interface GetThreadsOptions {
  userId?: number;
  authorId?: number;
  page?: number;
  limit?: number;
  cursor?: number;
}

export const getThreads = async (
  optionsOrUserId?: number | GetThreadsOptions,
  legacyAuthorId?: number
) => {
  let userId: number | undefined;
  let authorId: number | undefined;
  let page = 1;
  let limit = 10;
  let cursor: number | undefined;

  if (typeof optionsOrUserId === "number") {
    userId = optionsOrUserId;
    authorId = legacyAuthorId;
  } else if (typeof optionsOrUserId === "object" && optionsOrUserId !== null) {
    userId = optionsOrUserId.userId;
    authorId = optionsOrUserId.authorId;
    page = optionsOrUserId.page ?? 1;
    limit = optionsOrUserId.limit ?? 10;
    cursor = optionsOrUserId.cursor;
  }

  page = Math.max(1, Number(page) || 1);
  limit = Math.max(1, Math.min(100, Number(limit) || 10));

  const where = authorId ? { created_by: authorId } : undefined;

  const [total, threads] = await Promise.all([
    prisma.thread.count({ where }),
    prisma.thread.findMany({
      where,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      skip: cursor ? 1 : (page - 1) * limit,
      cursor: cursor ? { id: cursor } : undefined,
      take: limit,
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
        likes: userId
          ? {
              where: { user_id: userId },
              select: { id: true },
            }
          : false,
      },
    }),
  ]);

  return { total, threads, page, limit };
};

export const getThreadsFormatted = async (
  optionsOrUserId?: number | GetThreadsOptions,
  createdBy?: number
) => {
  const { total, threads, page, limit } = await getThreads(optionsOrUserId, createdBy);

  const formattedThreads = threads.map((thread) => ({
    id: thread.id,
    content: thread.content,
    created_at: thread.created_at,
    updated_at: thread.updated_at,
    image: thread.image ?? [],

    user: {
      id: String(thread.author.id),
      username: thread.author.username,
      name: thread.author.full_name,
      avatar: thread.author.photo_profile ?? "",
      photo_profile: thread.author.photo_profile ?? "",
      profile_picture: thread.author.photo_profile ?? "",
    },

    likes: thread._count.likes,
    reply: thread._count.replies,
    replies: thread._count.replies,
    isLiked: Array.isArray(thread.likes) ? thread.likes.length > 0 : false,
  }));

  const totalPages = Math.ceil(total / limit);

  return {
    threads: formattedThreads,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextCursor:
        formattedThreads.length === limit
          ? formattedThreads[formattedThreads.length - 1].id
          : null,
    },
  };
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
    updated_at: thread.updated_at,
    user: {
      id: String(thread.author.id),
      username: thread.author.username,
      name: thread.author.full_name,
      avatar: thread.author.photo_profile ?? "",
      photo_profile: thread.author.photo_profile ?? "",
      profile_picture: thread.author.photo_profile ?? "",
    },

    likes: thread._count.likes,
    reply: thread._count.replies,
    replies: thread._count.replies,
    isLiked: Array.isArray(thread.likes) ? thread.likes.length > 0 : false,
  };
};




