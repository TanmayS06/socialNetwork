import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { toggleLike } from "../services/like";
import { io } from "../app"; // sesuaikan path

export const toggle = async (req: AuthRequest, res: Response) => {
  try {
    const threadId = Number(req.body.thread_id);
    const userId = req.user?.id;

    if (!userId || Number.isNaN(threadId) || threadId <= 0) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const result = await toggleLike(userId, threadId);

    res.status(200).json({message:"Success to toogle like" ,result });

    io.emit("thread:like_updated", {
      threadId: result.threadId,
      likesCount: result.likesCount,
    });

    io.to(`user:${userId}`).emit("thread:like_updated", {
      threadId: result.threadId,
      likesCount: result.likesCount,
      isLiked: result.liked,
    });
  } catch (e) {
    console.error("[toggleLike] error:", e);
    return res.status(500).json({ message: "Failed to toggle like" });
  }
};
