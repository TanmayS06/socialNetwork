import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import * as ReplyController from "../../controllers/reply-controller";
import upload from "../../middleware/upload";
import { cacheGet, invalidateAfter } from "../../lib/cache";
import { cacheKeys } from "../../lib/cacheKey";

const router = express.Router();

router.use(authMiddleware);

/**
 * @openapi
 * tags:
 *   - name: Replies
 */

/**
 * @openapi
 * /replies:
 *   post:
 *     tags: [Replies]
 *     summary: Create reply (multipart image[])
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [thread_id]
 *             properties:
 *               thread_id: { type: integer, example: 10 }
 *               content: { type: string, example: "nice!" }
 *               image:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       200: { description: OK }
 */
router.post(
  "/replies",
  upload.array("images", 10),
  invalidateAfter((req) => {
    const threadId = (req as any)?.body?.thread_id;

    if (!threadId) {
      return [
        "threads:feed:page:*",
        "threads:user:*",
        "threads:detail:*",
        "replies:thread:*",
      ];
    }

    return [
      "threads:feed:page:*",
      "threads:user:*",
      cacheKeys.threadDetail(threadId),
      cacheKeys.repliesByThread(threadId),
    ];
  }),
  ReplyController.create
);


/**
 * @openapi
 * /threads/{id}/replies:
 *   get:
 *     tags: [Replies]
 *     summary: Get replies by thread id
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RepliesByThreadResponse"
 */
router.get(
    "/threads/:id/replies",
    cacheGet<{ id: string }>(
        (req) => cacheKeys.repliesByThread(req.params.id),
        20
    ),
    ReplyController.findByThreadId
);


/**
 * @openapi
 * /reply-likes/toggle:
 *   post:
 *     tags: [Replies]
 *     summary: Toggle like on reply
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reply_id]
 *             properties:
 *               reply_id: { type: integer, example: 99 }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ToggleReplyLikeResponse"
 */
router.post(
    "/reply-likes/toggle",
    invalidateAfter(() => [
        // karena body hanya reply_id (tanpa thread_id), kita aman invalidasi luas
        "replies:thread:*",
        "threads:detail:*",
        "threads:feed:page:*",
    ]),
    ReplyController.toggleLike
);

export default router;
