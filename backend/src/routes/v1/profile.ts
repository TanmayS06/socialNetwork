import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import * as ProfileController from "../../controllers/profile-controller";
import upload from "../../middleware/upload";
import { cacheGet, invalidateAfter } from "../../lib/cache";
import { cacheKeys } from "../../lib/cacheKey";

const router = express.Router();

router.use(authMiddleware);

/**
 * @openapi
 * tags:
 *   - name: Profile
 */

/**
 * @openapi
 * /profile:
 *   get:
 *     tags: [Profile]
 *     summary: Get my profile
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200: { description: OK }
 */
router.get(
    "/profile",
    authMiddleware,
    cacheGet((req: any) => cacheKeys.myProfile(req.user.id), 20),
    ProfileController.getProfile
);

/**
 * @openapi
 * /profile:
 *   patch:
 *     tags: [Profile]
 *     summary: Update my profile (multipart)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               full_name: { type: string, example: "Alex" }
 *               username: { type: string, example: "alex" }
 *               bio: { type: string, example: "hello" }
 *               avatar: { type: string, format: binary }
 *     responses:
 *       200: { description: OK }
 */
router.patch(
    "/profile",
    authMiddleware,
    upload.single("avatar"),
    invalidateAfter((req: any) => [
        cacheKeys.myProfile(req.user.id),
        "profile:user:*",
        "threads:feed:page:*",
        "threads:detail:*",
    ]),
    ProfileController.updateProfile
);

export default router;
