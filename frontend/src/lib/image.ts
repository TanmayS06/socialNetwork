const ORIGIN = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

export const DEFAULT_AVATAR = `${ORIGIN}/uploads/default-avatar.png`;

export const publicUrl = (p?: string | null): string | undefined => {
  if (!p) return undefined;
  if (p.startsWith("http")) return p;

  if (p.startsWith("uploads/")) return `${ORIGIN}/${p}`;
  if (p.startsWith("/")) return `${ORIGIN}${p}`;
  return `${ORIGIN}/${p}`;
};

export const publicUrlWithFallback = (
  p?: string | null,
  fallback: string = DEFAULT_AVATAR
): string => {
  return publicUrl(p) ?? fallback;
};

export const avatarSrc = (avatar?: string | null): string | undefined => {
  return publicUrl(avatar);
};

export const avatarImgSrc = (
  avatar?: string | null,
  version?: number,
  fallback: string = DEFAULT_AVATAR
): string => {
  const base = publicUrlWithFallback(avatar, fallback);
  return version ? `${base}?v=${version}` : base;
};