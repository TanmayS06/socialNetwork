import { Server } from "socket.io";
import { prisma } from "../prisma/client";
import type {
  UserDbModel,
  UserResponse,
  FollowerResponse,
  GetFollowListInput,
  FollowUserInput,
  UnfollowUserInput,
  FollowActionResult,
  GetFollowListForUserServiceInput,
} from "../types/followType";

export type EmitFollowChangedParams = {
  followerId: number;
  targetUserId: number;
  isFollowing: boolean;
};

// Memisahkan internal DB concern dari external API contract
function toUserResponse(u: UserDbModel): UserResponse {
  return {
    id: String(u.id),
    username: u.username,
    name: u.full_name,
    avatar: u.photo_profile ?? "",
  };
}

export async function getFollowListService(
  input: GetFollowListInput
): Promise<{ followers: FollowerResponse[] }> {
  const { userId, type } = input;

  if (type === "followers") {
    const rows = await prisma.following.findMany({
      where: { following_id: userId },
      select: {
        follower: {
          select: {
            id: true,
            username: true,
            full_name: true,
            photo_profile: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const followerUsers = rows.map((r) => r.follower);
    const followerIds = followerUsers.map((u) => u.id);

    const iFollowBack = await prisma.following.findMany({
      where: { follower_id: userId, following_id: { in: followerIds } },
      select: { following_id: true },
    });

    const followedSet = new Set(iFollowBack.map((x) => x.following_id));

    const followers: FollowerResponse[] = followerUsers.map((u) => ({
      ...toUserResponse(u as any),
      is_following: followedSet.has(u.id),
    }));

    return { followers };
  }

  // type === "following"
  const rows = await prisma.following.findMany({
    where: { follower_id: userId },
    select: {
      following: {
        select: {
          id: true,
          username: true,
          full_name: true,
          photo_profile: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  const followers: FollowerResponse[] = rows.map((r) => ({
    ...toUserResponse(r.following as any),
    is_following: true, // karena ini daftar yang kamu follow
  }));

  return { followers };
}


export async function followUserService(input: FollowUserInput): Promise<FollowActionResult> {
  const { userId, targetUserId } = input;

  // pastikan user target ada
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });

  if (!target) {
    return { success: false, reason: "USER_NOT_FOUND" };
  }

  // create (kalau sudah ada → unique constraint)
  try {
    await prisma.following.create({
      data: { follower_id: userId, following_id: targetUserId },
    });
  } catch {
    // idempotent: sudah follow pun tetap sukses
  }

  return { success: true };
}

export async function unfollowUserService(input: UnfollowUserInput): Promise<{ success: true }> {
  const { userId, targetUserId } = input;

  await prisma.following.deleteMany({
    where: { follower_id: userId, following_id: targetUserId },
  });

  return { success: true };
}

export async function isFollowingService(input: { userId: number; targetUserId: number }) {
  const { userId, targetUserId } = input;

  const row = await prisma.following.findFirst({
    where: { follower_id: userId, following_id: targetUserId },
    select: { id: true },
  });

  // mengubah nilai apapun menjadi boolean murni isFollow : row bisa object bisa null jika tidak ada
  return { isFollowing: !!row };
}

export async function getSuggestedUsersService(input: {
  userId: number;
  limit: number;
}): Promise<{ users: FollowerResponse[] }> {
  const { userId, limit } = input;

  // user yang sudah aku follow
  const followingRows = await prisma.following.findMany({
    where: { follower_id: userId },
    select: { following_id: true },
  });
  const followingIds = followingRows.map((x) => x.following_id);

  const users = await prisma.user.findMany({
    where: {
      id: { not: userId, notIn: followingIds },
    },
    select: { id: true, username: true, full_name: true, photo_profile: true },
    orderBy: { created_at: "desc" },
    take: limit,
  });

  const suggested: FollowerResponse[] = users.map((u) => ({
    ...toUserResponse(u as UserDbModel),
    is_following: false,
  }));

  return { users: suggested };
}


export async function getFollowListForUserService(
  input: GetFollowListForUserServiceInput
): Promise<{ followers: FollowerResponse[] }> {
  const { targetUserId, viewerUserId, type } = input;

  // ===== followers =====
  if (type === "followers") {
    const rows = await prisma.following.findMany({
      where: { following_id: targetUserId },
      select: {
        follower: {
          select: {
            id: true,
            username: true,
            full_name: true,
            photo_profile: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const users = rows.map((r) => r.follower);
    const ids = users.map((u) => u.id);

    const viewerFollowing = ids.length
      ? await prisma.following.findMany({
          where: { follower_id: viewerUserId, following_id: { in: ids } },
          select: { following_id: true },
        })
      : [];

    const viewerSet = new Set(viewerFollowing.map((x) => x.following_id));

    const followers: FollowerResponse[] = users.map((u) => ({
      ...(toUserResponse(u as any) as any),
      is_following: viewerSet.has(u.id),
    }));

    return { followers };
  }

  // ===== following =====
  const rows = await prisma.following.findMany({
    where: { follower_id: targetUserId },
    select: {
      following: {
        select: {
          id: true,
          username: true,
          full_name: true,
          photo_profile: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  const users = rows.map((r) => r.following);
  const ids = users.map((u) => u.id);

  let viewerSet = new Set<number>();

  // kalau viewer == target, otomatis true semua
  if (viewerUserId === targetUserId) {
    viewerSet = new Set(ids);
  } else {
    const viewerFollowing = ids.length
      ? await prisma.following.findMany({
          where: { follower_id: viewerUserId, following_id: { in: ids } },
          select: { following_id: true },
        })
      : [];

    viewerSet = new Set(viewerFollowing.map((x) => x.following_id));
  }

  const followers: FollowerResponse[] = users.map((u) => ({
    ...(toUserResponse(u as any) as any),
    is_following: viewerSet.has(u.id),
  }));

  return { followers };
}

