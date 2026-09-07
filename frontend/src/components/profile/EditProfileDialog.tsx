import React, { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";

import api from "@/lib/api";
import type { AppDispatch } from "@/store/types";
import {
  fetchProfile,
  selectMe,
  selectAvatarVersion,
  setMyAvatar,
  bumpAvatarVersion,
} from "@/store/profile";
import { avatarImgSrc } from "@/lib/image";
import { notify } from "@/lib/toast";

type EditForm = {
  name: string;
  username: string;
  bio: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coverStyle?: React.CSSProperties;
  onAvatarUpdated?: (newAvatar: string) => void;
};

export default function EditProfileDialog({
  open,
  onOpenChange,
  coverStyle,
  onAvatarUpdated,
}: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const me = useSelector(selectMe);
  const v = useSelector(selectAvatarVersion);

  const [form, setForm] = useState<EditForm>({ name: "", username: "", bio: "" });
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string>(avatarImgSrc(me?.avatar, v));
  const previewUrlRef = useRef<string | null>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setForm({
      name: me?.name ?? "",
      username: me?.username ?? "",
      bio: me?.bio ?? "",
    });

    setAvatarFile(null);
    setAvatarPreview(avatarImgSrc(me?.avatar, v));

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, [open, me, v]);

  const handleSaveProfile = async () => {
    if (saving) return;
    setSaving(true);
    const p = (async () => {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("username", form.username);
      fd.append("bio", form.bio);
      if (avatarFile) fd.append("avatar", avatarFile);

      const res = await api.patch("/profile", fd, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updated =
        res.data?.data?.profile ??
        res.data?.data?.user ??
        res.data?.data ??
        res.data?.profile ??
        res.data?.user ??
        res.data;

      const newAvatar: string | undefined =
        updated?.avatar ?? updated?.photo_profile ?? updated?.profile_picture;

      if (newAvatar) {
        dispatch(setMyAvatar(newAvatar));
        dispatch(bumpAvatarVersion());
        onAvatarUpdated?.(newAvatar);
      }

      await dispatch(fetchProfile()).unwrap();

      onOpenChange(false);
    })();

    notify.promise(
      p,
      {
        loading: "Saving changes...",
        success: "Profile updated successfully",
        error: "Failed to update profile",
      },
      { duration: 2500 }
    );

    try {
      await p;
    } catch (e: any) {
      console.error(e);
      const msg =
        e?.response?.data?.message ??
        e?.response?.data?.error ??
        "Failed to update profile";
      notify.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-[560px] rounded-2xl border border-zinc-800 bg-zinc-950 shadow-xl text-white">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="text-lg font-semibold">Edit profile</div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-2 hover:bg-zinc-900"
            disabled={saving}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pb-5">
          <div className="h-28 w-full rounded-2xl border border-zinc-800" style={coverStyle} />

          <div className="-mt-8 relative w-fit">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative"
              title="Ganti foto profil"
              disabled={saving}
            >
              <img
                src={avatarPreview}
                className="h-16 w-16 rounded-full border-4 border-zinc-950 object-cover"
                alt="avatar-preview"
              />
              <div className="absolute inset-0 rounded-full bg-black/40" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                setAvatarFile(file);

                if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
                const url = URL.createObjectURL(file);
                previewUrlRef.current = url;
                setAvatarPreview(url);
              }}
            />
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                disabled={saving}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-400">Username</label>
              <input
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                disabled={saving}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-400">Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                rows={4}
                className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                disabled={saving}
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-md shadow-violet-500/20 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 transition-all active:scale-[0.98]"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
