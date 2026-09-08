import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import FollowButton from "@/components/FollowButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarImgSrc } from "@/lib/image";
import { useSelector } from "react-redux";
import { selectAvatarVersion } from "@/store/profile";
import { UserPlus } from "lucide-react";
import { socket } from "@/lib/socket";
import { useNavigate } from "react-router-dom";

type UserItem = {
  id: string;
  username: string;
  name: string;
  followers: number;
  avatar?: string | null;
  is_following?: boolean;
};

const clampFollowers = (n: number) => (n < 0 ? 0 : n);

export default function SearchPage() {
  const v = useSelector(selectAvatarVersion);
  const nav = useNavigate();

  const [keyword, setKeyword] = useState("");
  const [debounced, setDebounced] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(keyword.trim()), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  useEffect(() => {
    const run = async () => {
      setError(null);

      if (!debounced) {
        setUsers([]);
        return;
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setLoading(true);
      try {
        const res = await api.get("/search", {
          params: { keyword: debounced },
          withCredentials: true,
          signal: ac.signal as any,
        });

        const list: UserItem[] = res.data?.data?.users ?? [];
        setUsers(Array.isArray(list) ? list : []);
      } catch (e: any) {
        if (e?.code === "ERR_CANCELED") return;
        setError(e?.message ?? "Search failed");
      } finally {
        setLoading(false);
      }
    };

    run();
    return () => abortRef.current?.abort();
  }, [debounced]);

  useEffect(() => {
    const onFollowChanged = (p: {
      followerId: number | string;
      targetUserId: number | string;
      isFollowing: boolean;
    }) => {
      const targetId = String(p.targetUserId);

      setUsers((prev) =>
        prev.map((u) => {
          if (String(u.id) !== targetId) return u;

          const nextFollowers = clampFollowers(
            Number(u.followers ?? 0) + (p.isFollowing ? 1 : -1)
          );

          return {
            ...u,
            is_following: p.isFollowing,
            followers: nextFollowers,
          };
        })
      );
    };

    socket.on("follow:changed", onFollowChanged);
    return () => {
      socket.off("follow:changed", onFollowChanged);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-10 border-b border-zinc-800 bg-black/70 backdrop-blur">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 focus-within:border-zinc-600">
            <UserPlus className="h-4 w-4 text-zinc-500" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search username or name..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-500"
            />
          </div>

          <div className="mt-2 text-xs text-zinc-500">
            {loading ? "Searching..." : debounced ? `Result: "${debounced}"` : "Type to search"}
          </div>
        </div>
      </div>

      {error && <div className="px-4 py-3 text-sm text-red-400">{error}</div>}

      <div className="divide-y divide-zinc-800">
        {users.map((u) => {
          const fallback = (u.name?.[0] ?? u.username?.[0] ?? "U").toUpperCase();
          const src = avatarImgSrc(u.avatar ?? undefined, v);

          return (
            <div
              key={u.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-zinc-900/40"
            >
              {/* ✅ TAMBAHKAN clickable user area */}
              <div
                className="flex items-center gap-3 min-w-0 cursor-pointer"
                onClick={() => nav(`/u/${u.username}`)}
              >
                <Avatar>
                  <AvatarImage src={src} />
                  <AvatarFallback>{fallback}</AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold hover:underline">{u.name}</div>
                  <div className="truncate text-xs text-zinc-400">@{u.username}</div>
                  <div className="text-xs text-zinc-500">{u.followers} followers</div>
                </div>
              </div>

              <FollowButton
                userId={u.id}
                isFollowing={u.is_following ?? false}
                user={{
                  id: String(u.id),
                  username: u.username,
                  name: u.name,
                  avatar: u.avatar ?? "",
                  is_following: u.is_following ?? false,
                }}
                onToggle={(next) => {
                  setUsers((prev) =>
                    prev.map((x) => {
                      if (String(x.id) !== String(u.id)) return x;

                      const nextFollowers = clampFollowers(
                        Number(x.followers ?? 0) + (next ? 1 : -1)
                      );

                      return { ...x, is_following: next, followers: nextFollowers };
                    })
                  );
                }}
              />
            </div>
          );
        })}

        {!loading && debounced && users.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-zinc-500">No users found.</div>
        )}
      </div>
    </div>
  );
}
