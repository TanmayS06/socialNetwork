// server.ts
import server from "./app";
import { connectRedis } from "./lib/redis";

const PORT = process.env.PORT;

if (!PORT) {
  throw new Error("PORT is not defined");
}

async function bootstrap() {
  try {
    await connectRedis();
    console.log("✅ Redis connected");
  } catch (e) {
    console.error("Redis failed to connect:", e);
  }

  server.listen(Number(PORT), "0.0.0.0", () => {
    console.log("⚡ [Pulse API] Engine initialized successfully");
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log(`📡 API Base : ${process.env.BACKEND_URL ?? `http://localhost:${PORT}`}/api/v1`);
    console.log(`📚 Swagger  : ${process.env.BACKEND_URL ?? `http://localhost:${PORT}`}/docs`);
  });
}

bootstrap();
