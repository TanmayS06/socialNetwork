import { useState } from "react";
import { LogOut, Menu, X, Activity } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarNav } from "./SidebarNav";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { logout } from "@/store";
import type { AppDispatch } from "@/store/types";

import {
  selectMe,
  selectIsProfileLoading,
  selectAvatarVersion,
} from "@/store/profile";

import { avatarImgSrc } from "@/lib/image";
import { resetAll } from "@/store/index";
import { socket } from "@/lib/socket";

const SidebarLeft = ({ onCreatePost }: { onCreatePost: () => void }) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const me = useSelector(selectMe);
  const loading = useSelector(selectIsProfileLoading);
  const v = useSelector(selectAvatarVersion);

  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await api.post("/logout", null, { withCredentials: true });
    } catch {
      // ignore
    } finally {
      if (socket.connected) socket.disconnect();
      dispatch(resetAll());
      dispatch(logout());
      navigate("/login", { replace: true });
    }
  };

  const name = me?.name ?? "Guest";
  const username = me?.username ?? "guest";
  const avatarSrc = avatarImgSrc(me?.avatar, v);
  const fallback = (name[0] ?? "U").toUpperCase();

  const SidebarContent = (
    <>
      <div className="px-5 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-md shadow-violet-500/20">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
            pulse
          </span>
        </div>

        {/* close button only for mobile drawer */}
        <button
          onClick={() => setOpen(false)}
          className="md:hidden rounded p-2 hover:bg-zinc-900"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5 text-zinc-200" />
        </button>
      </div>

      <div className="flex-1 px-2">
        <SidebarNav
          onCreatePost={() => {
            setOpen(false);
            onCreatePost();
          }}
        />
      </div>

      <div className="border-t border-zinc-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={avatarSrc} />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>

            <div className="text-sm">
              {loading ? (
                <>
                  <div className="h-4 w-28 animate-pulse rounded bg-zinc-800" />
                  <div className="mt-1 h-3 w-20 animate-pulse rounded bg-zinc-800" />
                </>
              ) : (
                <>
                  <p className="font-medium">{name}</p>
                  <p className="text-zinc-400">@{username}</p>
                </>
              )}
            </div>
          </div>

          <LogOut
            onClick={handleLogout}
            className={`h-5 w-5 cursor-pointer text-zinc-400 hover:text-red-500 ${
              loading ? "opacity-50 pointer-events-none" : ""
            }`}
          />
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* ✅ Mobile topbar (muncul hanya di mobile) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-zinc-950 border-b border-zinc-800 flex items-center px-4">
        <button
          onClick={() => setOpen(true)}
          className="rounded p-2 hover:bg-zinc-900"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5 text-zinc-200" />
        </button>

        <div className="flex-1 flex items-center justify-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-300 bg-clip-text text-transparent">
            pulse
          </span>
        </div>

        <div className="w-10" />
      </div>

      {/* ✅ Desktop sidebar (tetap seperti awal, tapi disembunyikan di mobile) */}
      <aside className="hidden md:flex fixed left-0 top-0 z-40 h-screen w-64 flex-col bg-zinc-950 border-x">
        {SidebarContent}
      </aside>

      {/* ✅ Mobile overlay */}
      <div
        className={[
          "md:hidden fixed inset-0 z-40 bg-black/60 transition-opacity",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={() => setOpen(false)}
      />

      {/* ✅ Mobile drawer */}
      <aside
        className={[
          "md:hidden fixed left-0 top-0 z-50 h-screen w-64 flex-col bg-zinc-950 border-r border-zinc-800 flex",
          "transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {SidebarContent}
      </aside>
    </>
  );
};

export default SidebarLeft;
