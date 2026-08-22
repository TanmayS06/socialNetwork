import type { Request, Response, NextFunction } from "express";
import { redis } from "./redis";

/**
 * Cache response JSON untuk GET route.
 */
export const cacheGet =
    <P = Record<string, string>>(
        keyBuilder: (req: Request<P>) => string,
        ttlSeconds = 30
    ) =>
    async (req: Request<P>, res: Response, next: NextFunction) => {
        try {
        const key = keyBuilder(req);
        const cached = await redis.get(key);

        if (cached) {
          const value =
            typeof cached === "string" ? cached : cached.toString();

          res.setHeader("X-Cache", "HIT");
          return res.status(200).json(JSON.parse(value));
        }

        const originalJson = res.json.bind(res);
        res.json = (body: any) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
            redis.set(key, JSON.stringify(body), { EX: ttlSeconds }).catch(() => {});
            res.setHeader("X-Cache", "MISS");
            }
            return originalJson(body);
        };

        return next();
        } catch {
        return next(); // Redis down? tetap lanjut DB.
        }
    };

/**
 * Hapus cache setelah request sukses (2xx).
 * Cocok untuk POST/PATCH/DELETE.
 *
 * - keyOrPatternsFn boleh return:
 *   - string key: "threads:detail:1"
 *   - pattern:    "threads:feed:page:*"
 */
export const invalidateAfter =
  <P = Record<string, string>>(
    keyOrPatternsFn: (req: Request<P>, res: Response) => string | string[] | Promise<string | string[]>
  ) =>
  (req: Request<P>, res: Response, next: NextFunction) => {
    const cleanup = async () => {
      if (!(res.statusCode >= 200 && res.statusCode < 300)) return;

      try {
        const items = await keyOrPatternsFn(req, res); // ✅ await
        const list = Array.isArray(items) ? items : [items];

        for (const item of list) {
          if (!item) continue;

            if (item.includes("*")) {
              let cursor = "0";

              do {
                const result = await redis.scan(cursor, {
                  MATCH: item,
                  COUNT: 200,
                });

                const nextCursor =
                  typeof result.cursor === "string"
                    ? result.cursor
                    : result.cursor.toString();

                const keys = result.keys;

                cursor = nextCursor;

                if (keys.length > 0) {
                  await redis.del(keys);
                }
              } while (cursor !== "0");
          } else {
            await redis.del(item);
          }
        }
      } catch (err) {
        console.warn("Redis invalidate error:", err);
      }
    };

    res.on("finish", () => {
      cleanup().catch(() => {});
    });

    next();
  };

