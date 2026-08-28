import type { NextFunction, RequestHandler, Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import type { FollowQueryType, UserDbModel, UserResponse } from "../types/followType";
import { getFollowListService, followUserService, unfollowUserService, isFollowingService, getSuggestedUsersService, getFollowListForUserService } from "../services/following";
import { io } from "../app";
import { prisma } from "../prisma/client";
import type { ParsedQs } from "qs";

type FollowParams = { userId: string };

// ✅ penting: gabung dengan ParsedQs
type FollowQuery = ParsedQs & {
  type?: string; // nanti diparse jadi FollowQueryType
};

export async function getFollows(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;

    const typeRaw = String(req.query.type ?? "");
    if (typeRaw !== "followers" && typeRaw !== "following") {
      return res.status(400).json({
        status: "error",
        message: "Query `type` must be `followers` or `following`.",
      });
    }

    const data = await getFollowListService({
      userId,
      type: typeRaw as FollowQueryType,
    });

    return res.json({ status: "success", data });
  } catch {
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch follower/following data. Please try again later.",
    });
  }
}

export async function followUser(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const targetUserId = Number(req.body?.followed_user_id);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "followed_user_id must be a positive integer.",
      });
    }

    if (targetUserId === userId) {
      return res.status(400).json({ status: "error", message: "You cannot follow yourself." });
    }

    const result = await followUserService({ userId, targetUserId });

   if (!result.success) {
      if (result.reason === "USER_NOT_FOUND") {
        return res.status(404).json({
          status: "error",
          message: "User not found.",
        });
      }

      return res.status(400).json({
        status: "error",
        message: "Follow action failed.",
      });
    }

    // ✅ ambil data FOLLOWER (aku)
    const follower = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        full_name: true,
        photo_profile: true,
      },
    });

    const followerUser = follower && {
      id: String(follower.id),
      username: follower.username,
      name: follower.full_name,
      avatar: follower.photo_profile ?? "",
    };

    io.to(`user:${userId}`).emit("follow:changed", {
      followerId: userId,
      targetUserId,
      isFollowing: true,
      followerUser,
    });

    io.to(`user:${targetUserId}`).emit("follow:changed", {
      followerId: userId,
      targetUserId,
      isFollowing: true,
      followerUser,
    });

    return res.json({
      status: "success",
      message: "You have successfully followed the user.",
      data: { user_id: String(targetUserId), is_following: true },
    });
  } catch {
    return res.status(500).json({
      status: "error",
      message: "Failed to follow the user. Please try again later.",
    });
  }
}


export async function unfollowUser(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const targetUserId = Number(req.body?.followed_user_id ?? req.body?.followed_id);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "followed_user_id must be a positive integer.",
      });
    }

    if (targetUserId === userId) {
      return res.status(400).json({ status: "error", message: "Invalid target user id." });
    }

    await unfollowUserService({ userId, targetUserId });

    const follower = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        full_name: true,
        photo_profile: true,
      },
    });

    const followerUser = follower && {
      id: String(follower.id),
      username: follower.username,
      name: follower.full_name,
      avatar: follower.photo_profile ?? "",
    };

    io.to(`user:${userId}`).emit("follow:changed", {
      followerId: userId,
      targetUserId,
      isFollowing: false,
      followerUser,
    });

    io.to(`user:${targetUserId}`).emit("follow:changed", {
      followerId: userId,
      targetUserId,
      isFollowing: false,
      followerUser,
    });

    return res.json({
      status: "success",
      message: "You have successfully unfollowed the user.",
      data: { user_id: String(targetUserId), is_following: false },
    });
  } catch {
    return res.status(500).json({
      status: "error",
      message: "Failed to unfollow the user. Please try again later.",
    });
  }
}



function toUserResponse(u: UserDbModel): UserResponse {
  return {
    id: String(u.id),
    username: u.username,
    name: u.full_name,
    avatar: u.photo_profile ?? "",
  };
}

export async function getSuggested(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;

    const limit = Math.min(Math.max(Number(req.query.limit ?? 5), 1), 20);

    const data = await getSuggestedUsersService({ userId, limit });

    return res.json({ status: "success", data });
  } catch {
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch suggested users. Please try again later.",
    });
  }
}

function parseFollowType(v: unknown): FollowQueryType {
  const s = Array.isArray(v) ? v[0] : v;
  return s === "following" ? "following" : "followers";
}

export const getFollowListForUserController: RequestHandler<
  FollowParams,
  any,
  any,
  FollowQuery
> = async (req, res, next) => {
  try {
    const targetUserId = Number(req.params.userId);
    const type = parseFollowType(req.query.type);

    const viewerUserId = Number((req as any).user?.id);

    if (!Number.isFinite(targetUserId)) {
      return res.status(400).json({ message: "Invalid userId param" });
    }

    if (!Number.isFinite(viewerUserId)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = await getFollowListForUserService({
      targetUserId,
      viewerUserId,
      type,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export async function getFollowsByUserId(req: AuthRequest, res: Response) {
  try {
    const viewerUserId = req.user!.id;
    const targetUserId = Number(req.params.userId);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Param `userId` must be a positive integer.",
      });
    }

    const typeRaw = String(req.query.type ?? "");
    if (typeRaw !== "followers" && typeRaw !== "following") {
      return res.status(400).json({
        status: "error",
        message: "Query `type` must be `followers` or `following`.",
      });
    }

    const data = await getFollowListForUserService({
      targetUserId,
      viewerUserId,
      type: typeRaw as any,
    });

    return res.json({ status: "success", data });
  } catch {
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch follower/following data. Please try again later.",
    });
  }
}


