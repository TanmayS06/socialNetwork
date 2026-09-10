import { Request, Response } from "express";
import { createThread, getThreadsById, getThreadsFormatted } from "../services/thread";
import { AuthRequest } from "../middleware/authMiddleware";
import { io } from "../app";
import { prisma } from "../prisma/client";
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
    const { content } = req.body;

    const files = (req.files as Express.Multer.File[]) ?? [];
    const images: string[] = await Promise.all(
      files.map((f) => uploadToCloudinary(f.buffer, "threads"))
    );

    const thread = await createThread(req.user!.id, content, images);

    io.to("feed").emit("thread:created", thread);

    return res.status(201).json({ success: true, thread });
  } catch (err) {
    console.error("[create thread] error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create thread" });
  }
};



export const findAll = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;

    const { threads, pagination } = await getThreadsFormatted({
      userId,
      page,
      limit,
      cursor,
    });

    return res.status(200).json({
      code: 200,
      status: "success",
      message: "Get Data Thread Successfully",
      data: {
        threads,
        pagination,
      },
    });
  } catch (err) {
    console.error("[findAll threads] error:", err);
    return res.status(500).json({ code: 500, status: "error", message: "Failed to fetch threads" });
  }
};

export const findThreadById = async (req: AuthRequest, res: Response) => {
  try {
    const threadId = Number(req.params.id);
    const userId = req.user?.id;

    if (Number.isNaN(threadId)) {
      return res.status(400).json({ code: 400, status: "error", message: "Invalid thread id" });
    }

    const data = await getThreadsById(threadId, userId);

    if (!data) {
      return res.status(404).json({ code: 404, status: "error", message: "Thread not found" });
    }

    return res.status(200).json({
      code: 200,
      status: "success",
      message: "Get Data Thread Successfully",
      data,
    });
  } catch (err) {
    return res.status(500).json({ code: 500, status: "error", message: "Internal server error" });
  }
};

export const findMyThreads = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ code: 401, status: "error", message: "Unauthorized" });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;

    const { threads, pagination } = await getThreadsFormatted({
      userId,
      authorId: userId,
      page,
      limit,
      cursor,
    });

    return res.status(200).json({
      code: 200,
      status: "success",
      message: "Get My Threads Successfully",
      data: {
        threads,
        pagination,
      },
    });
  } catch (err) {
    console.error("[findMyThreads] error:", err);
    return res.status(500).json({ code: 500, status: "error", message: "Internal server error" });
  }
};

export async function getThreadsByUserId(req: AuthRequest, res: Response) {
  try {
    const viewerId = req.user?.id;
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ status: "error", message: "Invalid userId" });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;

    const { threads, pagination } = await getThreadsFormatted({
      userId: viewerId,
      authorId: userId,
      page,
      limit,
      cursor,
    });

    return res.status(200).json({
      status: "success",
      data: {
        threads,
        pagination,
      },
    });
  } catch (err) {
    console.error("[getThreadsByUserId] error:", err);
    return res.status(500).json({ status: "error", message: "Failed to fetch threads" });
  }
}

export const updateThread = async (req: AuthRequest, res: Response) => {
  try {
    const threadId = Number(req.params.id);
    const userId = req.user?.id;
    const { content } = req.body;

    if (!userId || !Number.isInteger(threadId) || threadId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid request" });
    }

    const existing = await prisma.thread.findUnique({
      where: { id: threadId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Thread not found" });
    }

    if (existing.created_by !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const updated = await prisma.thread.update({
      where: { id: threadId },
      data: {
        content: content ?? existing.content,
        updated_by: userId,
      },
    });

    return res.status(200).json({ success: true, thread: updated });
  } catch (err) {
    console.error("[updateThread] error:", err);
    return res.status(500).json({ success: false, message: "Failed to update thread" });
  }
};

export const deleteThread = async (req: AuthRequest, res: Response) => {
  try {
    const threadId = Number(req.params.id);
    const userId = req.user?.id;

    if (!userId || !Number.isInteger(threadId) || threadId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid request" });
    }

    const existing = await prisma.thread.findUnique({
      where: { id: threadId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Thread not found" });
    }

    if (existing.created_by !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    await prisma.thread.delete({
      where: { id: threadId },
    });

    return res.status(200).json({ success: true, message: "Thread deleted successfully" });
  } catch (err) {
    console.error("[deleteThread] error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete thread" });
  }
};



