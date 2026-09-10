import type { Request, Response, NextFunction } from "express";
import { redis } from "./redis";

/**
 * Cache response JSON for GET routes.
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
      return next(); // If Redis is unavailable, continue to DB
    }
  };

/**
 * Invalidate Redis keys or pattern matches (e.g. "threads:feed:*").
 */
export async function invalidateCacheKeys(
  items: string | string[]
): Promise<void> {
  try {
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
}

/**
 * Invalidate cache after successful request (2xx status).
 * Awaits cache invalidation before sending JSON response to guarantee
 * read-your-writes consistency across subsequent requests.
 */
export const invalidateAfter =
  <P = Record<string, string>>(
    keyOrPatternsFn: (
      req: Request<P>,
      res: Response
    ) => string | string[] | Promise<string | string[]>
  ) =>
  (req: Request<P>, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any): Response {
      const statusCode = res.statusCode;

      if (statusCode >= 200 && statusCode < 300) {
        Promise.resolve(keyOrPatternsFn(req, res))
          .then((items) => invalidateCacheKeys(items))
          .catch((err) => console.warn("Redis invalidate error:", err))
          .finally(() => {
            originalJson(body);
          });
        return res;
      }

      return originalJson(body);
    };

    next();
  };
