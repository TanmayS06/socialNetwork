import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import * as ThreadController from "../../controllers/thread-controller";
import upload from "../../middleware/upload";
import { cacheGet, invalidateAfter } from "../../lib/cache";
import { cacheKeys } from "../../lib/cacheKey";

const router = express.Router();

router.use(authMiddleware);

/**
 * @openapi
 * tags:
 *   - name: Threads
 */

/**
 * @openapi
 * /threads:
 *   get:
 *     tags: [Threads]
 *     summary: Get all threads (feed)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     threads:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/Thread"
 */
router.get(
    "/threads",
    cacheGet((req) => cacheKeys.threadsFeed(String(req.query.page ?? "1")), 15),
    ThreadController.findAll
);
/**
 * @openapi
 * /threads:
 *   post:
 *     tags: [Threads]
 *     summary: Create thread (multipart images)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content: { type: string, example: "hello" }
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
    "/threads",
    upload.array("images", 10),
    invalidateAfter((req: any) => {
        // setelah create thread, feed pasti berubah
        return [
        "threads:feed:page:*",
        // juga aman clear cache list user & me
        `threads:me:${req.user?.id ?? "*"}`,
        "threads:user:*",
        ];
    }),
    ThreadController.create
);

/**
 * @openapi
 * /threads/me:
 *   get:
 *     tags: [Threads]
 *     summary: Get my threads
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200: { description: OK }
 */
router.get(
    "/threads/me",
    cacheGet((req: any) => cacheKeys.myThreads(req.user.id), 20),
    ThreadController.findMyThreads
);

/**
 * @openapi
 * /threads/{id}:
 *   get:
 *     tags: [Threads]
 *     summary: Get thread by id
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
router.get(
    "/threads/:id",
    cacheGet<{ id: string }>((req) => cacheKeys.threadDetail(req.params.id), 60),
    ThreadController.findThreadById
    );

/**
 * @openapi
 * /threads/user/{userId}:
 *   get:
 *     tags: [Threads]
 *     summary: Get threads by userId
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 */
router.get(
    "/threads/user/:userId",
    cacheGet<{ userId: string }>(
        (req) => cacheKeys.userThreads(req.params.userId),
        30
    ),
    ThreadController.getThreadsByUserId
);


export default router;
