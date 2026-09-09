import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { Thread } from "@/Types/thread";
import type { ReplyItem } from "@/Types/reply";
import api from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ImagePlus, Heart, MessageCircle } from "lucide-react";
import { socket } from "@/lib/socket";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/types";
import { publicUrl, avatarImgSrc } from "@/lib/image";
import { selectMe, selectAvatarVersion } from "@/store/profile";

// ===== helpers =====
function normalizeReplies(list: ReplyItem[]) {
  const map = new Map<number, ReplyItem>();
  for (const r of list) {
    const id = Number((r as any).id);
    if (!Number.isFinite(id)) continue;
    map.set(id, r);
  }
  return Array.from(map.values()).sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// fleksibel: backend kadang balikin { result: { liked, likesCount } } atau { data: { liked, likesCount } }
function pickLikeResult(res: any): { liked?: boolean; likesCount?: number } {
  const r = res?.data?.result ?? res?.data?.data ?? res?.data;
  return {
    liked: typeof r?.liked === "boolean" ? r.liked : undefined,
    likesCount: typeof r?.likesCount === "number" ? r.likesCount : undefined,
  };
}

// ambil boolean yang mungkin datang sebagai liked / isLiked
function pickLiked(payload: any): boolean | undefined {
  if (typeof payload?.liked === "boolean") return payload.liked;
  if (typeof payload?.isLiked === "boolean") return payload.isLiked;
  return undefined;
}

export default function ThreadDetailPage() {
  const { id } = useParams();
  const threadId = Number(id);
  const myUserId = useSelector((s: RootState) => s.auth.id);
  const me = useSelector(selectMe);
  const v = useSelector(selectAvatarVersion);

  const [thread, setThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<ReplyItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const replyPreviewUrls = useMemo(
    () => replyFiles.map((f) => URL.createObjectURL(f)),
    [replyFiles]
  );

  useEffect(() => {
    return () => {
      replyPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [replyPreviewUrls]);

  const removeReplyImage = (index: number) => {
    setReplyFiles((prev) => prev.filter((_, i) => i !== index));
  };
  const clearAllReplyImages = () => setReplyFiles([]);

  // (Optional) join/leave room per thread
  useEffect(() => {
    if (!threadId) return;
    socket.emit("thread:join", { threadId });
    return () => {
      socket.emit("thread:leave", { threadId });
    };
  }, [threadId]);

  // fetch thread + replies
  useEffect(() => {
    if (!threadId) return;

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);

        const [tRes, rRes] = await Promise.all([
          api.get(`/threads/${threadId}`, {
            signal: controller.signal,
            withCredentials: true,
          }),
          api.get(`/threads/${threadId}/replies`, {
            signal: controller.signal,
            withCredentials: true,
          }),
        ]);

        setThread(tRes.data.data as Thread);

        const list = (rRes.data.data?.replies ?? []) as ReplyItem[];
        setReplies(normalizeReplies(list));
      } catch (e: any) {
        if (
          e?.code === "ERR_CANCELED" ||
          e?.name === "CanceledError" ||
          e?.name === "AbortError"
        )
          return;
        console.error("Failed to fetch detail thread", e);
        setThread(null);
        setReplies([]);
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [threadId]);

  // socket: reply created
  useEffect(() => {
    if (!threadId) return;

    const onReplyCreated = (payload: any) => {
      const reply = payload?.reply ?? payload;
      if (!reply) return;
      if (Number(reply.thread_id ?? reply.threadId) !== threadId) return;

      setReplies((prev) => normalizeReplies([reply as ReplyItem, ...prev]));
    };

    socket.on("reply:created", onReplyCreated);
    return () => {
      socket.off("reply:created", onReplyCreated);
    };
  }, [threadId]);

  // socket: like updated (thread + reply)
  useEffect(() => {
    if (!threadId) return;

    // NOTE:
    // - payload global biasanya cuma { threadId/replyId, likesCount }
    // - payload khusus user bisa bawa liked/isLiked atau actorUserId+liked (tergantung implementasi backend)
    const onThreadLikeUpdated = (p: any) => {
      if (Number(p?.threadId) !== threadId) return;

      const liked = pickLiked(p);
      const actorUserId = typeof p?.actorUserId === "number" ? p.actorUserId : undefined;

      setThread((prev: any) => {
        if (!prev) return prev;

        const next: any = {
          ...prev,
          likes: typeof p?.likesCount === "number" ? p.likesCount : prev.likes,
        };

        // Update isLiked hanya jika:
        // 1) payload bawa liked/isLiked boolean, DAN
        // 2) (kalau ada actorUserId) hanya untuk user yang bersangkutan
        if (typeof liked === "boolean") {
          if (typeof actorUserId === "number") {
            if (actorUserId === myUserId) next.isLiked = liked;
          } else {
            // kalau backend kirim user-specific tanpa actorUserId, aman untuk apply
            next.isLiked = liked;
          }
        }

        return next;
      });
    };

    const onReplyLikeUpdated = (p: any) => {
      if (Number(p?.threadId) !== threadId) return;

      const liked = pickLiked(p);
      const actorUserId = typeof p?.actorUserId === "number" ? p.actorUserId : undefined;

      setReplies((prev) =>
        prev.map((r: any) => {
          if (Number(r.id) !== Number(p?.replyId)) return r;

          const next: any = {
            ...r,
            likes: typeof p?.likesCount === "number" ? p.likesCount : r.likes,
          };

          // Update isLiked hanya jika payload bawa boolean valid
          if (typeof liked === "boolean") {
            if (typeof actorUserId === "number") {
              if (actorUserId === myUserId) next.isLiked = liked;
            } else {
              next.isLiked = liked;
            }
          }

          return next;
        })
      );
    };

    socket.on("thread:like_updated", onThreadLikeUpdated);
    socket.on("reply:like_updated", onReplyLikeUpdated);

    return () => {
      socket.off("thread:like_updated", onThreadLikeUpdated);
      socket.off("reply:like_updated", onReplyLikeUpdated);
    };
  }, [threadId, myUserId]);

  const threadImages = useMemo(() => {
    const t: any = thread;
    const raw = Array.isArray(t?.image) ? t.image : [];
    return raw as string[];
  }, [thread]);

  // ===== actions =====
  const toggleThreadLike = async () => {
    if (!thread || likeLoading) return;

    const prevThread = thread;

    // optimistic
    setThread((t: any) =>
      t
        ? {
            ...t,
            isLiked: !t.isLiked,
            likes: t.isLiked ? (t.likes ?? 0) - 1 : (t.likes ?? 0) + 1,
          }
        : t
    );

    setLikeLoading(true);
    try {
      // endpoint thread like dari code lama
      const res = await api.post(
        "/likes/toggle",
        { thread_id: (thread as any).id },
        { withCredentials: true }
      );

      const { liked, likesCount } = pickLikeResult(res);
      if (typeof liked === "boolean" && typeof likesCount === "number") {
        setThread((t: any) => (t ? { ...t, isLiked: liked, likes: likesCount } : t));
      }
    } catch (e) {
      console.error("Toggle like failed", e);
      setThread(prevThread);
    } finally {
      setLikeLoading(false);
    }
  };

  const toggleReplyLike = async (replyId: number) => {
    // optimistic
    setReplies((prev) =>
      prev.map((r: any) =>
        Number(r.id) === replyId
          ? {
              ...r,
              isLiked: !r.isLiked,
              likes: r.isLiked ? (r.likes ?? 0) - 1 : (r.likes ?? 0) + 1,
            }
          : r
      )
    );

    try {
      const res = await api.post(
        "/reply-likes/toggle",
        { reply_id: replyId },
        { withCredentials: true }
      );

      const { liked, likesCount } = pickLikeResult(res);
      if (typeof liked === "boolean" && typeof likesCount === "number") {
        setReplies((prev) =>
          prev.map((r: any) =>
            Number(r.id) === replyId ? { ...r, isLiked: liked, likes: likesCount } : r
          )
        );
      }
    } catch (e) {
      console.error("Toggle reply like failed", e);
      // rollback: re-fetch
      try {
        const rRes = await api.get(`/threads/${threadId}/replies`, { withCredentials: true });
        const list = (rRes.data.data?.replies ?? []) as ReplyItem[];
        setReplies(normalizeReplies(list));
      } catch {}
    }
  };

  const handleSubmitReply = async () => {
    if (!threadId) return;
    if (!replyText.trim() && replyFiles.length === 0) return;

    try {
      setReplyLoading(true);

      const fd = new FormData();
      fd.append("thread_id", String(threadId));
      fd.append("content", replyText);
      // sesuai backend upload.array("image", 10)
      replyFiles.forEach((f) => fd.append("image", f));

      const res = await api.post("/replies", fd, { withCredentials: true });

      const newReply = res.data?.data?.reply ?? res.data?.reply ?? res.data?.data ?? res.data;

      if (newReply) {
        setReplies((prev) => normalizeReplies([newReply as ReplyItem, ...prev]));
      } else {
        const rRes = await api.get(`/threads/${threadId}/replies`, { withCredentials: true });
        const list = (rRes.data.data?.replies ?? []) as ReplyItem[];
        setReplies(normalizeReplies(list));
      }

      setReplyText("");
      setReplyFiles([]);
    } catch (error) {
      console.error("Failed to create reply", error);
    } finally {
      setReplyLoading(false);
    }
  };

  // ===== render =====
  if (loading) return <div className="p-6 text-white">Loading...</div>;
  if (!thread) return <div className="p-6 text-white">Thread tidak ditemukan</div>;

  // ===== avatar sync (ini yang kamu minta) =====
  const threadAuthor: any = (thread as any).user;
  const threadAuthorAvatar = avatarImgSrc(
    threadAuthor?.avatar ?? threadAuthor?.photo_profile ?? threadAuthor?.profile_picture,
    v
  );

  const myAvatar = avatarImgSrc(
    (me as any)?.avatar ?? (me as any)?.photo_profile ?? (me as any)?.profile_picture,
    v
  );

  return (
    <main className="flex-1 border-x border-zinc-800">
      <div className="sticky top-0 z-10 border-b border-zinc-800 bg-black/80 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            className="rounded-full p-2 hover:bg-zinc-900"
            title="Back"
            onClick={() => history.back()}
          >
            ←
          </button>
          <div className="text-lg font-semibold">Status</div>
        </div>
      </div>

      {/* Thread Card */}
      <section className="border-b border-zinc-800 px-4 py-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={threadAuthorAvatar} />
            <AvatarFallback>{(threadAuthor?.name || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="truncate font-semibold">{threadAuthor?.name}</div>
              <div className="truncate text-sm text-zinc-500">@{threadAuthor?.username}</div>
            </div>

            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">
              {(thread as any).content}
            </p>

            {/* Thread images */}
            {threadImages.length > 0 && (
              <div className="mt-3">
                {threadImages.length === 1 ? (
                  <img
                    src={publicUrl(threadImages[0])}
                    className="w-full max-h-[32rem] rounded-xl object-cover border border-zinc-800"
                    alt="thread"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {threadImages.map((img, i) => (
                      <img
                        key={i}
                        src={publicUrl(img)}
                        className="h-48 w-full rounded-xl object-cover border border-zinc-800"
                        alt={`thread-${i}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 flex items-center gap-6 text-zinc-500">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleThreadLike();
                }}
                disabled={likeLoading}
                className={`flex items-center gap-2 ${
                  (thread as any).isLiked ? "text-red-500" : "hover:text-zinc-300"
                } ${likeLoading ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <Heart className="h-4 w-4" fill={(thread as any).isLiked ? "currentColor" : "none"} />
                <span className="text-xs">{(thread as any).likes}</span>
              </button>

              <button className="flex items-center gap-2 hover:text-zinc-300">
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs">{replies.length}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Reply composer */}
      <section className="border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={myAvatar} />
            <AvatarFallback>{(me?.name || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>

          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply!"
            className="w-full bg-transparent text-[15px] placeholder:text-zinc-500 focus:outline-none"
            disabled={replyLoading}
          />

          <label
            className={`rounded-full p-2 text-violet-400 hover:bg-violet-500/10 cursor-pointer transition-colors ${
              replyLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title="Add image"
          >
            <input
              type="file"
              hidden
              multiple
              accept="image/*"
              disabled={replyLoading}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
                if (files.length === 0) return;
                setReplyFiles((prev) => [...prev, ...files].slice(0, 10));
                e.currentTarget.value = "";
              }}
            />
            <ImagePlus className="h-5 w-5" />
          </label>

          <Button
            type="button"
            onClick={handleSubmitReply}
            className="h-8 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-sm font-semibold text-white shadow-md shadow-violet-500/20 hover:from-violet-500 hover:to-indigo-500 transition-all active:scale-[0.98]"
            disabled={replyLoading || (!replyText.trim() && replyFiles.length === 0)}
          >
            {replyLoading ? "Posting..." : "Post"}
          </Button>
        </div>

        {replyPreviewUrls.length > 0 && (
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs text-zinc-400">{replyPreviewUrls.length} image(s)</div>
              <button
                type="button"
                onClick={clearAllReplyImages}
                className="text-xs text-zinc-400 hover:text-zinc-200"
                disabled={replyLoading}
              >
                Remove all
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {replyPreviewUrls.map((url, idx) => (
                <div key={url} className="relative overflow-hidden rounded-lg border border-zinc-800">
                  <img src={url} className="h-24 w-full object-cover" alt={`preview-${idx}`} />
                  <button
                    type="button"
                    onClick={() => removeReplyImage(idx)}
                    disabled={replyLoading}
                    className="absolute top-1 right-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Replies list */}
      <section>
        {replies.length === 0 ? (
          <div className="px-4 py-6 text-sm text-zinc-500">No reply yet</div>
        ) : (
          replies.map((r: any) => {
            const replyImgs = Array.isArray(r.image) ? (r.image as string[]) : [];
            const replyAuthor: any = r.user;

            const replyAvatar = avatarImgSrc(
              replyAuthor?.avatar ?? replyAuthor?.photo_profile ?? replyAuthor?.profile_picture,
              v
            );

            return (
              <div key={r.id} className="border-b border-zinc-800 px-4 py-4 hover:bg-zinc-900/30">
                <div className="flex gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={replyAvatar} />
                    <AvatarFallback>{(replyAuthor?.name || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold">{replyAuthor?.name ?? "Unknown"}</div>
                      <div className="truncate text-xs text-zinc-500">@{replyAuthor?.username ?? "-"}</div>
                    </div>

                    <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">{r.content ?? ""}</p>

                    {replyImgs.length > 0 && (
                      <div className="mt-2">
                        {replyImgs.length === 1 ? (
                          <img
                            src={publicUrl(replyImgs[0])}
                            className="w-full max-h-80 rounded-xl object-cover border border-zinc-800"
                            alt="reply"
                          />
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {replyImgs.map((img: string, i: number) => (
                              <img
                                key={i}
                                src={publicUrl(img)}
                                className="h-40 w-full rounded-xl object-cover border border-zinc-800"
                                alt={`reply-${i}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-6 text-zinc-500">
                      <button
                        onClick={() => toggleReplyLike(Number(r.id))}
                        className={`flex items-center gap-1 text-sm ${
                          r.isLiked ? "text-red-500" : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <Heart className="h-4 w-4" fill={r.isLiked ? "currentColor" : "none"} />
                        <span>{r.likes ?? 0}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
