import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import http from "http";
import { Server } from "socket.io";
import * as cookie from "cookie";
import jwt from "jsonwebtoken";

// Main router
import router from "./routes/index";

// Swagger documentation
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";

const app = express();

const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

/** ========= Middlewares ========= */
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// static uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Health check endpoint
app.get("/health", (_req, res) => res.json({ status: "healthy", service: "pulse-api" }));

/** ========= Swagger UI (/docs) ========= */
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      withCredentials: true, // penting kalau mau cookie ikut ke request swagger
    },
  })
);

/** ========= API Routes ========= */
app.use("/api/v1", router);

/** ========= HTTP Server + Socket.IO ========= */
const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    credentials: true,
  },
  transports: ["websocket"],
});

// Socket authentication via cookie token
io.use((socket, next) => {
  try {
    const raw = socket.request.headers.cookie;
    if (!raw) return next(new Error("No cookie"));

    const parsed = cookie.parse(raw);
    const token = parsed.token;
    if (!token) return next(new Error("Unauthorized"));

    const secret = process.env.JWT_SECRET;
    if (!secret) return next(new Error("JWT_SECRET not set"));

    const payload = jwt.verify(token, secret);

    // attach user payload to socket
    (socket.data as any).user = payload;

    return next();
  } catch {
    return next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  // Join general feed room
  socket.join("feed");

  // Auto-join personal room user:<id> for direct notifications
  const u = (socket.data as any).user;
  const myIdRaw = (u as any)?.id ?? (u as any)?.userId ?? (u as any)?.sub ?? 0;
  const myId = Number(myIdRaw);

  if (Number.isFinite(myId) && myId > 0) {
    socket.join(`user:${myId}`);
  }

  // ✅ OPTIONAL: allow explicit join from client (berguna kalau mau)
  socket.on("user:join", ({ userId }) => {
    const uid = Number(userId);
    if (!Number.isFinite(uid) || uid <= 0) return;
    socket.join(`user:${uid}`);
    console.log("✅ user:join:", `user:${uid}`, "socket:", socket.id);
  });

  socket.on("user:leave", ({ userId }) => {
    const uid = Number(userId);
    if (!Number.isFinite(uid) || uid <= 0) return;
    socket.leave(`user:${uid}`);
    console.log("✅ user:leave:", `user:${uid}`, "socket:", socket.id);
  });

  // contoh event
  socket.on("ping", () => {
    socket.emit("pong");
  });
});

export default server;
