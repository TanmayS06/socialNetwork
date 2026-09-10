import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";

import api from "@/lib/api";
import { socket } from "@/lib/socket";

import FollowButton from "@/components/FollowButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarImgSrc } from "@/lib/image";

import { selectAvatarVersion, selectMe } from "@/store/profile";
import type { FollowUserItem, GetFollowersRes } from "@/Types/follows";
import { ArrowLeft } from "lucide-react";

type Tab = "followers" | "following";

const isCanceled = (e: any) =>
  e?.name === "CanceledError" || e?.code === "ERR_CANCELED";

export default function UserFollowPage() {
    const { username } = useParams();
    const [sp, setSp] = useSearchParams();
    const navigate = useNavigate();

    const me = useSelector(selectMe);
    const avatarVersion = useSelector(selectAvatarVersion);

    const tab: Tab = sp.get("tab") === "following" ? "following" : "followers";

    const [targetUser, setTargetUser] = useState<any>(null);
    const [list, setList] = useState<FollowUserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const nav = useNavigate()

    const targetUserId = Number(targetUser?.id || 0);
    const listRef = useRef(list);
    listRef.current = list;


    useEffect(() => {
        if (!username) return;

        const controller = new AbortController();

        (async () => {
        try {
            setLoading(true);
            const res = await api.get(`/users/${username}`, {
            withCredentials: true,
            signal: controller.signal,
            });
            setTargetUser(res.data?.data ?? res.data ?? null);
        } catch (e) {
            if (!isCanceled(e)) {
            console.error("Failed to fetch user profile", e);
            }
            setTargetUser(null);
        } finally {
            setLoading(false);
        }
        })();

        return () => controller.abort();
    }, [username]);


    const fetchList = async (uid: number, t: Tab, signal?: AbortSignal) => {
        const res = await api.get<GetFollowersRes>(`/follows/user/${uid}`, {
        params: { type: t },
        withCredentials: true,
        signal,
        });

        if (res.data?.status === "success") {
        setList(res.data.data?.followers ?? []);
        } else {
        setList([]);
        }
    };

    useEffect(() => {
        if (!targetUserId) return;

        const controller = new AbortController();

        (async () => {
        try {
            setLoading(true);
            await fetchList(targetUserId, tab, controller.signal);
        } catch (e) {
            if (!isCanceled(e)) {
            console.error("Failed to fetch follow list", e);
            }
            setList([]);
        } finally {
            setLoading(false);
        }
        })();

        return () => controller.abort();
    }, [targetUserId, tab]);

    useEffect(() => {
        if (!targetUserId) return;

        const handler = (payload: any) => {
            const followerId = String(payload?.followerId);
            const targetId = String(payload?.targetUserId);
            const isFollowing = Boolean(payload?.isFollowing);
            const followerUser = payload?.followerUser;


            if (tab === "followers" && targetId === String(targetUserId)) {
            setList((prev) => {
                const exists = prev.some((u) => String(u.id) === followerId);

                if (isFollowing && followerUser && !exists) {
                return [
                    {
                    id: followerUser.id,
                    username: followerUser.username,
                    name: followerUser.name,
                    avatar: followerUser.avatar,
                    is_following: true, 
                    },
                    ...prev,
                ];
                }


                if (!isFollowing) {
                return prev.filter((u) => String(u.id) !== followerId);
                }

                return prev;
            });
            }

            if (tab === "following" && followerId === String(targetUserId)) {
            setList((prev) => {
                if (!isFollowing) {
                return prev.filter((u) => String(u.id) !== targetId);
                }

                fetchList(targetUserId, tab).catch(() => {});
                return prev;
            });
            }

            if (me?.id && followerId === String(me.id)) {
            setList((prev) =>
                prev.map((u) =>
                String(u.id) === targetId
                    ? { ...u, is_following: isFollowing }
                    : u
                )
            );
            }
        };

        socket.on("follow:changed", handler);
        return () => {
            socket.off("follow:changed", handler);
        };
    }, [targetUserId, tab, me?.id]);

    const title = useMemo(
        () => `@${targetUser?.username ?? username ?? ""}`,
        [targetUser?.username, username]
    );

    return (
        <div className="min-h-screen bg-black text-white">
        {/* HEADER */}
        <div className="sticky top-0 z-10 border-b border-zinc-800 bg-black/80 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-3">
            <div>
                <div className="text-sm font-semibold">Follows</div>
                <div className="text-xs text-zinc-400">{title}</div>
            </div>
            <button onClick={() => nav(-1)} className="rounded-full p-2 hover:bg-zinc-900">
                <ArrowLeft className="h-5 w-5" />
            </button>
            </div>
        </div>

        {/* TABS */}
        <div className="px-4 py-4">
            <div className="grid grid-cols-2 border-b border-zinc-800 mb-4">
            <button
                onClick={() => setSp({ tab: "followers" })}
                className={`pb-3 text-sm font-medium transition-colors ${
                tab === "followers"
                    ? "border-b-2 border-violet-500 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
            >
                Followers
            </button>
            <button
                onClick={() => setSp({ tab: "following" })}
                className={`pb-3 text-sm font-medium transition-colors ${
                tab === "following"
                    ? "border-b-2 border-violet-500 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
            >
                Following
            </button>
            </div>

            {/* CONTENT */}
            {loading ? (
            <div className="text-sm text-zinc-400">Loading...</div>
            ) : list.length === 0 ? (
            <div className="text-sm text-zinc-400">No data.</div>
            ) : (
            <div className="space-y-3">
                {list.map((u) => {
                const img = avatarImgSrc(u.avatar, avatarVersion);
                const fallback =
                    (u.name?.[0] ?? u.username?.[0] ?? "U").toUpperCase();

                return (
                    <div
                    key={u.id}
                    className="flex items-center justify-between"
                    >
                    <button
                        onClick={() => navigate(`/u/${u.username}`)}
                        className="flex items-center gap-3 min-w-0 text-left"
                    >
                        <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={img} />
                        <AvatarFallback>{fallback}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                        <div className="font-medium truncate hover:underline">
                            {u.name || u.username}
                        </div>
                        <div className="text-sm text-zinc-400 truncate">
                            @{u.username}
                        </div>
                        </div>
                    </button>

                    {me?.id && (
                        <FollowButton
                        userId={u.id}
                        isFollowing={Boolean(u.is_following)}
                        user={u}
                        />
                    )}
                    </div>
                );
                })}
            </div>
            )}
        </div>
        </div>
    );
}
