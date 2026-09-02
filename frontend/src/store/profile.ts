import { createAction, createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/store/index";
import api from "@/lib/api";
import { resetAll } from "@/store/index";

export type Profile = {
  id: number;
  username: string;
  name: string;
  avatar: string;
  bio?: string;
  follower_count?: number;
  following_count?: number;
};

type Status = "idle" | "loading" | "succeeded" | "failed";

type ProfileState = {
  me: Profile | null;
  fetchStatus: Status;
  fetchError: string | null;
  avatarVersion: number;
};

const initialState: ProfileState = {
  me: null,
  fetchStatus: "idle",
  fetchError: null,
  avatarVersion: 0,
};

export const fetchProfile = createAsyncThunk<Profile, void, { rejectValue: string }>(
  "profile/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/profile");
      const p = data?.data?.profile ?? data?.data?.user ?? data?.data ?? data?.profile;
      if (!p) return rejectWithValue("Profile not found");

      const mapped: Profile = {
        id: Number(p.id),
        username: p.username,
        name: p.name ?? p.full_name ?? p.fullName ?? "",
        avatar: p.avatar ?? p.photo_profile ?? "",
        bio: p.bio ?? "",
        follower_count: p.follower_count ?? p.followerCount ?? 0,
        following_count: p.following_count ?? p.followingCount ?? 0,
      };

      return mapped;
    } catch (e: any) {
      return rejectWithValue(e?.response?.data?.message ?? "Failed to fetch profile");
    }
  }
);

// ===== realtime count action (dipanggil dari socket) =====
export type ProfileFollowCountChangedPayload = {
  myId: number;
  followerId: number;
  targetUserId: number;
  isFollowing: boolean;
};

export const profileFollowCountChanged = createAction<ProfileFollowCountChangedPayload>(
  "profile/followCountChanged"
);

const inc = (n: number | undefined, d: number) => Math.max(0, (n ?? 0) + d);

const slice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    // ✅ dipanggil setelah upload avatar sukses (tanpa perlu fetchProfile)
    setMyAvatar: (s, a: PayloadAction<string>) => {
      if (!s.me) return;
      s.me.avatar = a.payload;
    },
    // ✅ cache-buster: bikin avatarImgSrc(..., v) berubah
    bumpAvatarVersion: (s) => {
      s.avatarVersion += 1;
    },
  },
  extraReducers: (b) => {
    b
      .addCase(fetchProfile.pending, (s) => {
        s.fetchStatus = "loading";
        s.fetchError = null;
      })
      .addCase(fetchProfile.fulfilled, (s, a) => {
        s.fetchStatus = "succeeded";
        s.me = a.payload;
        s.avatarVersion += 1; // ✅ sudah benar: setiap fetch profile, bump version
      })
      .addCase(fetchProfile.rejected, (s, a) => {
        s.fetchStatus = "failed";
        s.fetchError = (a.payload as string) ?? "Failed";
        s.me = null;
      })

      // ✅ realtime update follower_count/following_count
      .addCase(profileFollowCountChanged, (s, a) => {
        if (!s.me) return;

        const { myId, followerId, targetUserId, isFollowing } = a.payload;
        if (s.me.id !== myId) return;

        const delta = isFollowing ? 1 : -1;

        if (myId === followerId) {
          s.me.following_count = inc(s.me.following_count, delta);
        }

        if (myId === targetUserId) {
          s.me.follower_count = inc(s.me.follower_count, delta);
        }
      })

      .addCase(resetAll, () => initialState);
  },
});

export default slice.reducer;

// ✅ export actions
export const { setMyAvatar, bumpAvatarVersion } = slice.actions;

// selectors
export const selectMe = (s: RootState) => s.profile.me;
export const selectProfileFetchStatus = (s: RootState) => s.profile.fetchStatus;
export const selectProfileFetchError = (s: RootState) => s.profile.fetchError;
export const selectIsProfileLoading = (s: RootState) => s.profile.fetchStatus === "loading";
export const selectAvatarVersion = (s: RootState) => s.profile.avatarVersion;
