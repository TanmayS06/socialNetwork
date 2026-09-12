import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { prisma } from "../../prisma/client";
import type { AuthRequest } from "../../middleware/authMiddleware";
import type { Response } from "express";

const router = express.Router();

router.use(authMiddleware);

/**
 * @openapi
 * tags:
 *   - name: Search
 */

/**
 * @openapi
 * /search:
 *   get:
 *     tags: [Search]
 *     summary: Search users by username or full name
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of matching users
 */
router.get("/search", async (req: AuthRequest, res: Response) => {
    try {
        const query = String(req.query.q ?? "").trim();
        const viewerId = req.user!.id;

        if (!query) {
            return res.json({ status: "success", data: [] });
        }

        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { username: { contains: query, mode: "insensitive" } },
                    { full_name: { contains: query, mode: "insensitive" } },
                ],
                NOT: { id: viewerId },
            },
            select: {
                id: true,
                username: true,
                full_name: true,
                photo_profile: true,
                bio: true,
                _count: {
                    select: {
                        followers: true,
                        following: true,
                    },
                },
            },
            take: 20,
        });

        const result = users.map((u) => ({
            id: String(u.id),
            username: u.username,
            name: u.full_name,
            avatar: u.photo_profile ?? "",
            bio: u.bio ?? "",
            followersCount: u._count.followers,
            followingCount: u._count.following,
        }));

        return res.json({ status: "success", data: result });
    } catch (err) {
        console.error("[search] error:", err);
        return res.status(500).json({ status: "error", message: "Search failed" });
    }
});

export default router;
