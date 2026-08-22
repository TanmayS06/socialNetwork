import { createClient } from "redis";

export const redis = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
});

redis.on("connect", () => {
    console.log("✅ Redis connected");
});

redis.on("error", (err) => {
    console.error("❌ Redis error", err);
});

    // connect sekali saat app start
export async function connectRedis() {
    if (!redis.isOpen) {
        await redis.connect();
    }
}
