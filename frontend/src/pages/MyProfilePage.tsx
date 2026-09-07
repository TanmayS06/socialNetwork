import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft } from "lucide-react";

import api from "@/lib/api";
import type { AppDispatch } from "@/store/types";
import {
  fetchProfile,
  selectAvatarVersion,
  selectMe,
  selectProfileFetchStatus,
} from "@/store/profile";

import PostRow from "@/components/posts/PostRow";
import { setThreadLikeFromServer } from "@/store/likes";
import type { Thread } from "@/Types/thread";
import { socket } from "@/lib/socket";
import { avatarImgSrc, publicUrl } from "@/lib/image";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import EditProfileDialog from "@/components/profile/EditProfileDialog";
import { useNavigate } from "react-router-dom";

type LikeUpdatedPayload = {
  threadId?: number | string;
  id?: number | string;
  likes?: number | string;
  likesCount?: number | string;
  isLiked?: boolean; // private only
};

const normalizeImages = (t: any): string[] => {
  const img = t?.image ?? t?.images;
  if (Array.isArray(img)) return img.filter(Boolean);
  if (typeof img === "string" && img.trim() !== "") return [img];
  return [];
};

const toNumber = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * ✅ Tambahan aman:
 * PostRow kamu baca thread.reply
 * Jadi kita pastikan reply ada dari berbagai bentuk response backend.
 */
const seedReplyField = (t: any) => {
  const replyCount = toNumber(
    t?.reply ??
      t?.replies_count ??
      t?.reply_count ??
      t?._count?.replies ??
      (Array.isArray(t?.replies) ? t.replies.length : 0) ??
      0,
    0
  );

  // tidak mengubah field lain—hanya memastikan reply ada
  return { ...t, reply: replyCount };
};

export default function MyProfilePage() {
  const dispatch = useDispatch<AppDispatch>();

  const me = useSelector(selectMe);
  const profileStatus = useSelector(selectProfileFetchStatus);
  const v = useSelector(selectAvatarVersion);

  const [tab, setTab] = useState<"posts" | "media">("posts");
  const [openEdit, setOpenEdit] = useState(false);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);

  const nav = useNavigate();

  const displayName = me?.name ?? "Guest";
  const fallback = (displayName?.[0] ?? "U").toUpperCase();
  const src = me?.avatar ? avatarImgSrc(me.avatar, v) : "https://github.com/shadcn.png";

  // fetch profile jika belum ada
  useEffect(() => {
    if (!me && profileStatus !== "loading") {
      dispatch(fetchProfile());
    }
  }, [dispatch, me, profileStatus]);

  // fetch my threads
  useEffect(() => {
    const run = async () => {
      setLoadingThreads(true);
      try {
        const res = await api.get("/threads/me", { withCredentials: true });
        const list: Thread[] = res.data?.data?.threads ?? res.data?.threads ?? [];

        // ✅ seed reply field (aman)
        const seeded = (list ?? []).map(seedReplyField) as any;

        setThreads(seeded);

        // ✅ REST seed: isLiked + likesCount
        seeded.forEach((t: any) => {
          dispatch(
            setThreadLikeFromServer({
              threadId: toNumber(t.id),
              isLiked: Boolean(t.isLiked),
              likesCount: toNumber(t.likes ?? 0),
            })
          );
        });
      } catch (e) {
        console.error("Failed to fetch my threads", e);
        setThreads([]);
      } finally {
        setLoadingThreads(false);
      }
    };

    run();
  }, [dispatch]);

  // socket sync
  useEffect(() => {
    if (!me?.id) return;

    const onThreadCreated = (payload: any) => {
      const t: any = payload?.thread ?? payload;
      if (!t?.id) return;

      // thread bisa punya author di `user` atau `User` tergantung format backend
      const authorId = toNumber(t?.user?.id ?? t?.User?.id ?? t?.user_id ?? t?.userId, 0);

      // ✅ ini halaman "My Profile" => hanya tambah kalau thread milik saya
      if (authorId !== toNumber(me.id)) return;

      const seeded = seedReplyField(t);

      setThreads((prev) => {
        const exists = prev.some((x: any) => toNumber(x.id) === toNumber(seeded.id));
        if (exists) return prev;
        return [seeded as Thread, ...prev];
      });

      // seed likes store biar UI like konsisten
      dispatch(
        setThreadLikeFromServer({
          threadId: toNumber(seeded.id),
          isLiked: Boolean((seeded as any).isLiked),
          likesCount: toNumber((seeded as any).likes ?? 0),
        })
      );
    };

    const onLikeUpdated = (payload: LikeUpdatedPayload) => {
      const rawThreadId = payload.threadId ?? payload.id;
      const threadId = toNumber(rawThreadId, 0);
      if (!threadId) return;

      const likesCount =
        payload.likesCount !== undefined
          ? toNumber(payload.likesCount)
          : payload.likes !== undefined
          ? toNumber(payload.likes)
          : undefined;

      setThreads((prev) =>
        prev.map((t: any) => {
          if (toNumber(t.id) !== threadId) return t;
          const next: any = { ...t };
          if (likesCount !== undefined) next.likes = likesCount;
          if (typeof payload.isLiked === "boolean") next.isLiked = payload.isLiked;
          return next;
        })
      );

      const patch: any = { threadId };
      if (likesCount !== undefined) patch.likesCount = likesCount;
      if (typeof payload.isLiked === "boolean") patch.isLiked = payload.isLiked;

      dispatch(setThreadLikeFromServer(patch));
    };

    /**
     * ✅ Tambahan: realtime reply count via socket langsung
     * Payload kamu: { threadId, reply: {..., thread_id} }
     */
    const onReplyCreated = (payload: any) => {
      const reply = payload?.reply ?? payload;
      const tid = String(reply?.thread_id ?? payload?.threadId ?? reply?.threadId ?? "");
      if (!tid) return;

      setThreads((prev) =>
        prev.map((t: any) => {
          if (String(t?.id) !== tid) return t;

          const cur = toNumber(t?.reply, 0);
          const next = cur + 1;

          return {
            ...t,
            reply: next,
            replies_count:
              t?.replies_count != null ? toNumber(t.replies_count, cur) + 1 : t?.replies_count,
            reply_count:
              t?.reply_count != null ? toNumber(t.reply_count, cur) + 1 : t?.reply_count,
            _count:
              t?._count?.replies != null
                ? { ...(t._count ?? {}), replies: toNumber(t._count.replies, cur) + 1 }
                : t?._count,
          };
        })
      );
    };

    socket.on("thread:created", onThreadCreated);
    socket.on("thread:like_updated", onLikeUpdated);
    socket.on("reply:created", onReplyCreated);

    return () => {
      socket.off("thread:created", onThreadCreated);
      socket.off("thread:like_updated", onLikeUpdated);
      socket.off("reply:created", onReplyCreated);
    };
  }, [dispatch, me?.id]);

  /**
   * ✅ Tambahan: realtime reply count via window event bus
   * Kalau kamu pakai useReplySocket() global di AppLayout.
   */
  useEffect(() => {
    const handler = (e: any) => {
      const tid = String(e?.detail?.threadId ?? "");
      if (!tid) return;

      setThreads((prev) =>
        prev.map((t: any) => {
          if (String(t?.id) !== tid) return t;

          const cur = toNumber(t?.reply, 0);
          const next = cur + 1;

          return {
            ...t,
            reply: next,
            replies_count:
              t?.replies_count != null ? toNumber(t.replies_count, cur) + 1 : t?.replies_count,
            reply_count:
              t?.reply_count != null ? toNumber(t.reply_count, cur) + 1 : t?.reply_count,
            _count:
              t?._count?.replies != null
                ? { ...(t._count ?? {}), replies: toNumber(t._count.replies, cur) + 1 }
                : t?._count,
          };
        })
      );
    };

    window.addEventListener("app:reply_created", handler as any);
    return () => window.removeEventListener("app:reply_created", handler as any);
  }, []);

  const mediaImages = useMemo(() => {
    const all: string[] = [];
    for (const t of threads as any[]) {
      const imgs = normalizeImages(t)
        .map((p) => publicUrl(p))
        .filter((x): x is string => typeof x === "string" && x.length > 0);

      if (imgs.length) all.push(...imgs);
    }
    return all;
  }, [threads]);

  const coverStyle = {
    background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #06b6d4 100%)",
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* HEADER */}
      <div className="sticky top-0 z-10 border-b border-zinc-800 bg-black/70 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => nav(-1)} className="rounded-full p-2 hover:bg-zinc-900">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-sm font-semibold">{me?.name ?? "My Profile"}</div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="mt-4 h-36 w-full rounded-2xl border border-zinc-800" style={coverStyle} />

        <div className="-mt-10 flex items-end justify-between px-2">
          <Avatar className="h-20 w-20 border-4 border-black">
            <AvatarImage
              src={src}
              onError={(e) => (e.currentTarget.src = "https://github.com/shadcn.png")}
            />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>

          <button
            onClick={() => setOpenEdit(true)}
            className="rounded-full border border-white/60 px-4 py-1 text-sm hover:bg-white/10"
          >
            Edit Profile
          </button>
        </div>

        <div className="mt-3 px-2">
          <div className="text-xl font-bold">{me?.name ?? "Guest"}</div>
          <div className="text-sm text-zinc-400">@{me?.username ?? "guest"}</div>
          <div className="mt-2 text-sm text-zinc-300">{me?.bio ?? ""}</div>

          <div className="mt-2 flex gap-4 text-sm">
            <button
              onClick={() => nav("/follow")}
              className="flex gap-1 hover:underline"
              type="button"
            >
              <b>{(me as any)?.following_count ?? 0}</b>{" "}
              <span className="text-zinc-400">Following</span>
            </button>

            <button
              onClick={() => nav("/follow")}
              className="flex gap-1 hover:underline"
              type="button"
            >
              <b>{(me as any)?.follower_count ?? 0}</b>{" "}
              <span className="text-zinc-400">Followers</span>
            </button>
          </div>
        </div>

        <div className="mt-5 border-b border-zinc-800">
          <div className="flex">
            <button
              onClick={() => setTab("posts")}
              className={`flex-1 py-3 text-sm ${
                tab === "posts" ? "text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              <div className="mx-auto w-fit">All Posts</div>
              {tab === "posts" && <div className="mx-auto mt-2 h-[2px] w-40 bg-gradient-to-r from-violet-500 to-indigo-500" />}
            </button>

            <button
              onClick={() => setTab("media")}
              className={`flex-1 py-3 text-sm ${
                tab === "media" ? "text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              <div className="mx-auto w-fit">Media</div>
              {tab === "media" && <div className="mx-auto mt-2 h-[2px] w-40 bg-gradient-to-r from-violet-500 to-indigo-500" />}
            </button>
          </div>
        </div>

        {tab === "posts" ? (
          <div className="pt-4">
            {loadingThreads ? (
              <div className="space-y-4 px-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 border-b border-zinc-800 pb-4">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-800" />
                    <div className="flex-1">
                      <div className="h-4 w-40 animate-pulse rounded bg-zinc-800" />
                      <div className="mt-2 h-3 w-full animate-pulse rounded bg-zinc-800" />
                      <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-zinc-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {threads.map((t: any) => (
                  <PostRow key={toNumber(t.id)} thread={t} />
                ))}
                {threads.length === 0 && (
                  <div className="px-2 py-8 text-sm text-zinc-400">Belum ada post.</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="pt-4">
            <div className="grid grid-cols-3 gap-2 px-2 pb-6">
              {mediaImages.map((src, i) => (
                <div key={`${src}-${i}`} className="overflow-hidden rounded-xl border border-zinc-800">
                  <img src={src} alt={`media-${i}`} className="aspect-square w-full object-cover" />
                </div>
              ))}
              {!loadingThreads && mediaImages.length === 0 && (
                <div className="col-span-3 py-10 text-center text-sm text-zinc-400">
                  Belum ada media.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <EditProfileDialog
        open={openEdit}
        onOpenChange={setOpenEdit}
        coverStyle={coverStyle}
        onAvatarUpdated={(newAvatar) => {
          setThreads((prev) =>
            prev.map((t: any) => ({
              ...t,
              user: t.user ? { ...t.user, avatar: newAvatar } : t.user,
              User: t.User ? { ...t.User, avatar: newAvatar } : t.User,
            }))
          );
        }}
      />
    </div>
  );
}
