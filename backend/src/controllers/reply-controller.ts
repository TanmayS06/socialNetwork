import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { createReply, getRepliesByThreadId } from "../services/reply";
import { toggleReplyLike } from "../services/reply";
import { io } from "../app";
import cloudinary from "../config/cloudinary";

async function uploadToCloudinary(buffer: Buffer, folder: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error || !result) return reject(error);
      resolve(result.secure_url);
    }).end(buffer);
  });
}


export const create = async (req: AuthRequest, res: Response) => {
  try {
    const { thread_id, content } = req.body;

    const threadId = Number(thread_id);
    if (!threadId || Number.isNaN(threadId)) {
      return res.status(400).json({ message: "Invalid thread_id" });
    }

    const files = (req.files as Express.Multer.File[]) ?? [];
    const images: string[] = await Promise.all(
      files.map((f) => uploadToCloudinary(f.buffer, "replies"))
    );

    const reply = await createReply(req.user!.id, threadId, content ?? "", images);

  
    io.emit("reply:created", {
      threadId,
      reply: { ...reply, thread_id: threadId },
    });

    io.emit("thread:reply_count_updated", {
      threadId,
      delta: 1,
      replyId: (reply as any)?.id, // optional
    });

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("[createReply] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const findByThreadId = async (req: AuthRequest, res: Response) => {
  try {
    const threadId = Number(req.params.id);
    const userId = req.user?.id;

    if (Number.isNaN(threadId)) {
      return res.status(400).json({ code: 400, status: "error", message: "Invalid thread id" });
    }

    const data = await getRepliesByThreadId(threadId, userId);

    if (!data) {
      return res.status(404).json({ code: 404, status: "error", message: "Thread not found" });
    }

    return res.status(200).json({
      code: 200,
      status: "success",
      message: "Get Replies Successfully",
      data,
    });
  } catch (err) {
    return res.status(500).json({ code: 500, status: "error", message: "Internal server error" });
  }
};




export const toggleLike = async (req: AuthRequest, res: Response) => {
  try {
    const raw = req.body.reply_id ?? req.body.replyId ?? req.body.id;
    const replyId = Number(raw);
    const userId = req.user?.id;

    if (!userId || !Number.isInteger(replyId) || replyId <= 0) {
      return res.status(400).json({
        code: 400,
        status: "error",
        message: "Invalid request",
        debug: { rawReplyId: raw },
      });
    }

    const result = await toggleReplyLike(replyId, userId);

    io.emit("reply:like_updated", {
      replyId: result.replyId,
      threadId: result.threadId,
      likesCount: result.likesCount,
    });

    io.to(`user:${userId}`).emit("reply:like_updated", {
      replyId: result.replyId,
      threadId: result.threadId,
      likesCount: result.likesCount,
      isLiked: result.liked,
    });

    return res.status(200).json({
      code: 200,
      status: "success",
      message: "Toggle Reply Like Successfully",
      data: result,
    });
  } catch (err) {
    console.error("[toggleReplyLike] error:", err);
    return res.status(500).json({ code: 500, status: "error", message: "Internal server error" });
  }
};





