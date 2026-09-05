const API_ORIGIN = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

export const publicUrl = (p?: string | null): string => {
  if (!p) return "";
  if (p.startsWith("http")) return p;
  if (p.startsWith("uploads/")) return `${API_ORIGIN}/${p}`;
  if (p.startsWith("/uploads/")) return `${API_ORIGIN}${p}`;
  if (p.startsWith("/")) return `${API_ORIGIN}${p}`;
  return `${API_ORIGIN}/${p}`;
};

export const safeImgSrc = (src?: string | null) => {
  const s = publicUrl(src);
  return s || undefined;
};

// avatar = publicUrl + fallback + cache-buster
export const avatarImgSrc = (src?: string | null, v?: number): string => {
  const base = publicUrl(src);
  if (!base) return "https://github.com/shadcn.png";
  if (v == null) return base;
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}v=${v}`;
};
