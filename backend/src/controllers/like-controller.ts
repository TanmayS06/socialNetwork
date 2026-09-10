import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { toggleLike } from "../services/like";
import { io } from "../app";

export const toggle = async (req: AuthRequest, res: Response) => {
  try {
    const threadId = Number(req.body.thread_id);
    const userId = req.user?.id;

    if (!userId || Number.isNaN(threadId) || threadId <= 0) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const result = await toggleLike(userId, threadId);

    // Send authoritative response back to client
    res.status(200).json({ message: "Success to toogle like", result });

    // Emit events ONLY after database operation succeeds
    // Prevent duplicate events for the active user:
    // 1. Broadcast to all other users (likesCount only)
    io.except(`user:${userId}`).emit("thread:like_updated", {
      threadId: result.threadId,
      likesCount: result.likesCount,
    });

    // 2. Deliver exactly one targeted event to the active user (including isLiked)
    io.to(`user:${userId}`).emit("thread:like_updated", {
      threadId: result.threadId,
      likesCount: result.likesCount,
      isLiked: result.liked,
    });
  } catch (e: any) {
    console.error("[toggleLike] error:", e);
    if (e.statusCode === 404) {
      return res.status(404).json({ message: "Thread not found" });
    }
    return res.status(500).json({ message: "Failed to toggle like" });
  }
};
