import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { toggle } from "../../controllers/like-controller";

const router = express.Router();

router.use(authMiddleware);

/**
 * @openapi
 * tags:
 *   - name: Interactions
 */

/**
 * @openapi
 * /interactions/like:
 *   post:
 *     tags: [Interactions]
 *     summary: Toggle like on a thread
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               thread_id: { type: integer }
 *     responses:
 *       200: { description: OK }
 */
router.post("/interactions/like", toggle);

export default router;
