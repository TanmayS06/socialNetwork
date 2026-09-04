import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FaGithub, FaLinkedin, FaFacebook, FaInstagram } from "react-icons/fa";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "@/store/types";

import {
  selectMe,
  selectIsProfileLoading,
  selectAvatarVersion,
} from "@/store/profile";

import { fetchSuggestedThunk, selectSuggested } from "@/store/follow";
import FollowButton from "@/components/FollowButton";
import { avatarImgSrc } from "@/lib/image";

const SidebarRight = ({ onEditProfile }: { onEditProfile: () => void }) => {
  const dispatch = useDispatch<AppDispatch>();
  const nav = useNavigate();

  const me = useSelector(selectMe);
  const loading = useSelector(selectIsProfileLoading);
  const v = useSelector(selectAvatarVersion);

  const suggested = useSelector(selectSuggested);
  const location = useLocation();
  const isProfilePage = location.pathname.startsWith("/profile");

  // suggested masih boleh fetch di sini (karena ini memang data sidebar)
  useEffect(() => {
    if (!me?.id) return;
    dispatch(fetchSuggestedThunk(5));
  }, [dispatch, me?.id]);

  const displayName = me?.name ?? "Guest";
  const displayUsername = me?.username ? `@${me.username}` : "@guest";
  const avatarSrc = avatarImgSrc(me?.avatar, v);
  const fallback = (displayName?.[0] ?? "").toUpperCase();
  const bio = me?.bio ?? "Welcome to Pulse! Add a bio to share your story.";

  const following = me?.following_count ?? 0;
  const followers = me?.follower_count ?? 0;

  // ✅ FIX: tidak pakai fetchStatus/error di sini
  const isLoggedOut = !loading && !me;

  return (
    <aside className="space-y-4 px-4 py-6">
      {!isProfilePage && (
        <Card className="bg-zinc-900">
          <div className="rounded-xl p-2">
            <div className="h-20 rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-pink-500" />

            <div className="-mt-8 flex items-end justify-between">
              <Avatar className="h-16 w-16 border-4 border-zinc-900 ml-2">
                <AvatarImage src={avatarSrc} />
                <AvatarFallback>{fallback}</AvatarFallback>
              </Avatar>

              <Button
                onClick={onEditProfile}
                variant="whiteOutline"
                className="rounded-full border border-white px-4 py-1 text-sm mt-10"
                disabled={loading || !me}
              >
                {loading ? "Loading..." : "Edit Profile"}
              </Button>
            </div>

            <div className="mt-2">
              <p className="font-semibold">{displayName}</p>
              <p className="text-sm text-zinc-400">{displayUsername}</p>

              <p className="mt-2 text-sm text-zinc-300">{bio}</p>

              <div className="mt-3 flex gap-4 text-sm">
                <span>
                  <b>{following}</b>{" "}
                  <span className="text-zinc-400">Following</span>
                </span>
                <span>
                  <b>{followers}</b>{" "}
                  <span className="text-zinc-400">Followers</span>
                </span>
              </div>

              {isLoggedOut && (
                <p className="mt-3 text-xs text-zinc-400">You are currently browsing as a guest.</p>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card className="bg-zinc-900">
        <div className="rounded-xl bg-zinc-900 p-4">
          <h2 className="mb-3 font-semibold">Suggested for you</h2>

          {!me?.id ? (
            <p className="text-sm text-zinc-400">Log in to view recommendations.</p>
          ) : suggested.length === 0 ? (
            <p className="text-sm text-zinc-500">No suggestion available</p>
          ) : (
            suggested.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2">
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => nav(`/u/${u.username}`)}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={avatarImgSrc(u.avatar, v)} />
                    <AvatarFallback>
                      {(u.name?.[0] ?? "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="text-sm">
                    <p className="font-medium hover:underline">{u.name}</p>
                    <p className="text-zinc-400">@{u.username}</p>
                  </div>
                </div>

                <FollowButton userId={u.id} isFollowing={u.is_following ?? false} />
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="bg-zinc-900/60 border-zinc-800">
        <div className="flex flex-col gap-2.5 px-5 py-4 text-xs text-zinc-400">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-300">Pulse Platform</span>

            <div className="flex items-center gap-3 text-zinc-400">
              <FaGithub className="h-4 w-4 cursor-pointer hover:text-white transition-colors" />
              <FaLinkedin className="h-4 w-4 cursor-pointer hover:text-white transition-colors" />
              <FaFacebook className="h-4 w-4 cursor-pointer hover:text-white transition-colors" />
              <FaInstagram className="h-4 w-4 cursor-pointer hover:text-white transition-colors" />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[11px] text-zinc-400">
            <span className="cursor-pointer hover:text-zinc-200">About</span>
            <span>•</span>
            <span className="cursor-pointer hover:text-zinc-200">Privacy</span>
            <span>•</span>
            <span className="cursor-pointer hover:text-zinc-200">Terms</span>
            <span>•</span>
            <span className="cursor-pointer hover:text-zinc-200">API</span>
          </div>

          <p className="text-[11px] text-zinc-400">
            © 2026 Pulse Media, Inc. • Real-time Social Network
          </p>
        </div>
      </Card>
    </aside>
  );
};

export default SidebarRight;
