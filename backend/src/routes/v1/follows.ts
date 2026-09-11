import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
    getFollows,
    followUser,
    unfollowUser,
    getSuggested,
    getFollowsByUserId,
    getFollowListForUserController,
} from "../../controllers/following-controller";

const router = express.Router();

router.use(authMiddleware);

/**
 * @openapi
 * tags:
 *   - name: Follows
 */

/**
 * @openapi
 * /follows:
 *   get:
 *     tags: [Follows]
 *     summary: Get followers or following list for the authenticated user
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [followers, following] }
 *     responses:
 *       200: { description: OK }
 */
router.get("/follows", getFollows);

/**
 * @openapi
 * /follows/suggested:
 *   get:
 *     tags: [Follows]
 *     summary: Get suggested users to follow
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 5 }
 *     responses:
 *       200: { description: OK }
 */
router.get("/follows/suggested", getSuggested);

/**
 * @openapi
 * /follows/user/{userId}:
 *   get:
 *     tags: [Follows]
 *     summary: Get followers/following for a specific user
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [followers, following] }
 *     responses:
 *       200: { description: OK }
 */
router.get("/follows/user/:userId", getFollowListForUserController);

/**
 * @openapi
 * /follows:
 *   post:
 *     tags: [Follows]
 *     summary: Follow a user
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               followed_user_id: { type: integer }
 *     responses:
 *       200: { description: OK }
 */
router.post("/follows", followUser);

/**
 * @openapi
 * /follows:
 *   delete:
 *     tags: [Follows]
 *     summary: Unfollow a user
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               followed_user_id: { type: integer }
 *     responses:
 *       200: { description: OK }
 */
router.delete("/follows", unfollowUser);

export default router;
