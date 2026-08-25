import express from "express";
import * as AuthController from "../../controllers/auth-controller";

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Authentication endpoints
 */

/**
 * @openapi
 * /register:
 *   post:
 *     tags: [Auth]
 *     summary: Register user
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [full_name, username, email, password]
 *             properties:
 *               full_name: { type: string, example: "Alex" }
 *               username: { type: string, example: "alex" }
 *               email: { type: string, example: "alex@example.com" }
 *               password: { type: string, example: "password123" }
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post("/register", AuthController.handleRegister);

/**
 * @openapi
 * /login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user (set cookie token)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, password]
 *             properties:
 *               identifier: { type: string, example: "alex OR alex@example.com" }
 *               password: { type: string, example: "password123" }
 *     responses:
 *       200:
 *         description: OK (cookie token set)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AuthLoginResponse"
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */
router.post("/login", AuthController.handleLogin);

/**
 * @openapi
 * /logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout (clear cookie token)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.post("/logout", AuthController.handleLogout);

export default router;
