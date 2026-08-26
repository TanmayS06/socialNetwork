import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { getUserProfile } from "../../controllers/user-profile-controller";
import { cacheGet } from "../../lib/cache";
import { cacheKeys } from "../../lib/cacheKey";

const router = express.Router();

router.use(authMiddleware);

/**
 * @openapi
 * tags:
 *   - name: Users
 */

/**
 * @openapi
 * /users/{username}:
 *   get:
 *     tags: [Users]
 *     summary: Get user profile by username
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string, example: "alex" }
 *     responses:
 *       200: { description: OK }
 *       404: { description: User not found }
 */
router.get(
    "/users/:username",
    cacheGet((req) => cacheKeys.userByUsername(String(req.params.username)), 30),
    getUserProfile
);

export default router;
