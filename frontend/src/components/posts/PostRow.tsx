import { useEffect, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThreadImages from "@/helpers/ThreadsImageProps";
import type { Thread } from "@/Types/thread";

import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "@/store/types";
import {
  selectThreadLike,
  selectThreadLikeMaybe,
  selectLikePending,
  optimisticToggleThread,
  rollbackThread,
  toggleThreadLike,
  setThreadLikeFromServer,
} from "@/store/likes";

import { publicUrl, avatarImgSrc } from "@/lib/image";
import { selectAvatarVersion, selectMe } from "@/store/profile";
import type React from "react";

const toNumber = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export default function PostRow({ thread }: { thread: Thread }) {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const v = useSelector(selectAvatarVersion);

  const me = useSelector(selectMe);

  const tid = toNumber((thread as any).id, 0);

  // ✅ ADDED: raw store value (undefined kalau belum ada)
  const likeStateMaybe = useSelector(selectThreadLikeMaybe(tid));
  const likeState = useSelector(selectThreadLike(tid));
  const pending = useSelector(selectLikePending(`thread:${tid}`));

  // ✅ pakai maybe dulu supaya seed benar
  const like =
    likeStateMaybe ??
    likeState ?? {
      isLiked: Boolean((thread as any).isLiked),
      likesCount: toNumber((thread as any).likes),
    };

  useEffect(() => {
    if (!tid) return;

    // ✅ kalau store sudah ada, jangan seed ulang
    if (likeStateMaybe) return;

    dispatch(
      setThreadLikeFromServer({
        threadId: tid,
        isLiked: Boolean((thread as any).isLiked),
        likesCount: toNumber((thread as any).likes),
      })
    );
  }, [dispatch, likeStateMaybe, tid, thread]);

  const images = useMemo(() => {
    const raw = (thread as any)?.image;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((p: string) => publicUrl(p)).filter(Boolean);
    }
    return [];
  }, [thread]);

  const onToggleLike = async () => {
    if (!tid) return;
    const prev = like;

    dispatch(optimisticToggleThread({ threadId: tid }));
    try {
      await dispatch(toggleThreadLike(tid)).unwrap();
    } catch (e) {
      console.error("Toggle like failed", e);
      dispatch(rollbackThread({ threadId: tid, prev }));
    }
  };

  const author = (thread as any)?.user;
  const authorAvatar = avatarImgSrc(
    author?.avatar ?? author?.profile_picture ?? author?.photo_profile,
    v
  );

  // ✅ ADDED: klik author -> jika diri sendiri => /profile else => /u/:username
  const onGoToUser = (e: React.MouseEvent | React.KeyboardEvent) => {
    // @ts-ignore
    e.stopPropagation?.();

    const uname = author?.username;
    if (!uname) return;

    const myUsername = (me as any)?.username;
    const myId = String((me as any)?.id ?? "");
    const authorId = String(author?.id ?? "");

    if ((myUsername && uname === myUsername) || (myId && authorId && myId === authorId)) {
      navigate("/profile");
      return;
    }

    navigate(`/u/${uname}`);
  };

  /**
   * ✅ ADDED: reply count robust
   * - tetap prioritas thread.reply (karena kamu sudah seed di beberapa page)
   * - fallback ke replies_count / reply_count / _count.replies
   */
  const replyCount = useMemo(() => {
    const t: any = thread as any;
    return toNumber(
      t?.reply ??
        t?.replies_count ??
        t?.reply_count ??
        t?._count?.replies ??
        (Array.isArray(t?.replies) ? t.replies.length : 0) ??
        0,
      0
    );
  }, [thread]);

  return (
    <div
      key={tid || String((thread as any).id)}
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/thread/${tid}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") navigate(`/thread/${tid}`);
      }}
      className="flex gap-4 border-b border-zinc-800 px-4 py-4 hover:bg-zinc-900/50"
    >
      {/* ✅ ADDED: avatar clickable */}
      <Avatar
        role="button"
        tabIndex={0}
        onClick={onGoToUser}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onGoToUser(e);
        }}
        className="cursor-pointer"
      >
        <AvatarImage src={authorAvatar} />
        <AvatarFallback>
          {(((author?.name?.[0] ?? "U") as string).toUpperCase())}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-1 text-sm">
          {/* ✅ ADDED: name clickable */}
          <span
            role="button"
            tabIndex={0}
            onClick={onGoToUser}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onGoToUser(e);
            }}
            className="font-semibold text-zinc-100 hover:underline"
          >
            {author?.name ?? "Unknown"}
          </span>

          <span className="text-zinc-400">
            {/* ✅ ADDED: username clickable */}
            <span
              role="button"
              tabIndex={0}
              onClick={onGoToUser}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onGoToUser(e);
              }}
              className="hover:underline"
            >
              @{author?.username ?? "unknown"}
            </span>{" "}
            ·{" "}
            {(thread as any).created_at ? new Date((thread as any).created_at).toLocaleString() : ""}
          </span>
        </div>

        <p className="mt-1 text-sm leading-relaxed text-zinc-200">{(thread as any).content}</p>

        {images.length > 0 && <ThreadImages images={images as any} />}

        <div className="mt-3 flex items-center gap-8 text-sm text-zinc-400">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike();
            }}
            disabled={pending}
            className={`flex items-center gap-1 ${
              like.isLiked ? "text-red-500" : "hover:text-zinc-200"
            } ${pending ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <Heart className="h-4 w-4" fill={like.isLiked ? "currentColor" : "none"} />
            <span>{like.likesCount}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/thread/${tid}`);
            }}
            className="flex items-center gap-1 hover:text-zinc-200"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{replyCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
