import type { FollowQueryType } from "../types/followType";

export function parseFollowType(v: unknown): FollowQueryType {
  // handle: undefined, string, array
  const s = Array.isArray(v) ? v[0] : v;

  return s === "following" ? "following" : "followers";
}