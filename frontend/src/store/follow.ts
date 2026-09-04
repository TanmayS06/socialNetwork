import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/store/index";
import { followsApi } from "@/services/follows";
import { resetAll } from "@/store/index";

export type FollowUserItem = {
  id: string;
  username: string;
  name: string;
  avatar: string;
  is_following?: boolean;
};

type Status = "idle" | "loading" | "succeeded" | "failed";

type State = {
  followers: FollowUserItem[];
  following: FollowUserItem[];
  suggested: FollowUserItem[];

  statusFollowers: Status;
  statusFollowing: Status;
  statusSuggested: Status;

  error: string | null;
};

export type SocketFollowChangedPayload = {
  myId: number;
  followerId: number;
  targetUserId: number;
  isFollowing: boolean;
  followerUser?: {
    id: string;
    username: string;
    name: string;
    avatar: string;
  };
};

const initialState: State = {
  followers: [],
  following: [],
  suggested: [],
  statusFollowers: "idle",
  statusFollowing: "idle",
  statusSuggested: "idle",
  error: null,
};

const patchIsFollowing = (arr: FollowUserItem[], targetId: number, val: boolean) => {
  const idStr = String(targetId);
  const i = arr.findIndex((x) => x.id === idStr);
  if (i !== -1) arr[i] = { ...arr[i], is_following: val };
};

const removeById = (arr: FollowUserItem[], id: string) => arr.filter((u) => u.id !== id);

const upsertFront = (arr: FollowUserItem[], item: FollowUserItem) => {
  const i = arr.findIndex((x) => x.id === item.id);
  if (i === -1) return [item, ...arr];
  const copy = [...arr];
  copy[i] = { ...copy[i], ...item };
  // move to front (optional)
  copy.unshift(copy.splice(i, 1)[0]);
  return copy;
};

// ===== THUNKS =====
export const fetchFollowersThunk = createAsyncThunk<
  FollowUserItem[],
  void,
  { rejectValue: string }
>("follow/fetchFollowers", async (_, { rejectWithValue }) => {
  try {
    const res = await followsApi.followers();
    if (res.status === "error") return rejectWithValue(res.message);
    return res.data.followers;
  } catch (e: any) {
    return rejectWithValue(e?.response?.data?.message ?? "Failed to fetch followers");
  }
});

export const fetchFollowingThunk = createAsyncThunk<
  FollowUserItem[],
  void,
  { rejectValue: string }
>("follow/fetchFollowing", async (_, { rejectWithValue }) => {
  try {
    const res = await followsApi.following();
    if (res.status === "error") return rejectWithValue(res.message);
    // backend kamu pakai key followers juga
    return res.data.followers;
  } catch (e: any) {
    return rejectWithValue(e?.response?.data?.message ?? "Failed to fetch following");
  }
});

export const fetchSuggestedThunk = createAsyncThunk<
  FollowUserItem[],
  number,
  { rejectValue: string }
>("follow/fetchSuggested", async (limit, { rejectWithValue }) => {
  try {
    const res = await followsApi.suggested(limit);
    if (res.status === "error") return rejectWithValue(res.message);
    return res.data.users;
  } catch (e: any) {
    return rejectWithValue(e?.response?.data?.message ?? "Failed to fetch suggested");
  }
});

export const followThunk = createAsyncThunk<boolean, number, { rejectValue: string }>(
  "follow/follow",
  async (id, { rejectWithValue }) => {
    try {
      const res = await followsApi.follow(id);
      if (res.status === "error") return rejectWithValue(res.message);
      return true;
    } catch (e: any) {
      return rejectWithValue(e?.response?.data?.message ?? "Failed to follow");
    }
  }
);

export const unfollowThunk = createAsyncThunk<
  boolean,
  { id: number; user?: FollowUserItem },
  { rejectValue: string }
>("follow/unfollow", async ({ id }, { rejectWithValue }) => {
  try {
    const res = await followsApi.unfollow(id);
    if (res.status === "error") return rejectWithValue(res.message);
    return true;
  } catch (e: any) {
    return rejectWithValue(e?.response?.data?.message ?? "Failed to unfollow");
  }
});


// ===== SLICE =====
const slice = createSlice({
  name: "follow",
  initialState,
  reducers: {
    followChanged: (s, a: PayloadAction<SocketFollowChangedPayload>) => {
      const { myId, followerId, targetUserId, isFollowing, followerUser } = a.payload;

      const mid = String(myId);
      const fid = String(followerId);
      const tid = String(targetUserId);

      // selalu toggle status di suggested (kalau ada)
      patchIsFollowing(s.suggested, targetUserId, isFollowing);

      // ===== CASE A: AKU ADALAH FOLLOWER (aku follow/unfollow orang)
      if (mid === fid) {
        // following + suggested must toggle
        patchIsFollowing(s.following, targetUserId, isFollowing);
        patchIsFollowing(s.suggested, targetUserId, isFollowing);

        if (isFollowing) {
          // pindahin dari suggested -> following (jika ada)
          const picked = s.suggested.find((x) => x.id === tid);
          if (picked) {
            const exists = s.following.some((x) => x.id === tid);
            if (!exists) s.following.unshift({ ...picked, is_following: true });
            s.suggested = removeById(s.suggested, tid);
          } else {
            // kalau tidak ada di suggested, minimal pastikan dia marked true kalau ada
            patchIsFollowing(s.following, targetUserId, true);
          }
        } else {
          // remove dari following
          const removed = s.following.find((x) => x.id === tid);
          s.following = removeById(s.following, tid);

          // optional: masukin ke suggested lagi
          if (removed) {
            const exists = s.suggested.some((x) => x.id === tid);
            if (!exists) {
              s.suggested = [{ ...removed, is_following: false }, ...s.suggested].slice(0, 5);
            }
          }
        }
      }

      // ===== CASE B: AKU ADALAH TARGET (followers-ku berubah)
      if (mid === tid) {
        if (isFollowing) {
          // orang follow aku → add follower user (kalau ada)
          if (followerUser) {
            const exists = s.followers.some((u) => u.id === fid);
            if (!exists) {
              s.followers.unshift({ ...followerUser, is_following: false });
            } else {
              // update info follower jika berubah
              s.followers = upsertFront(s.followers, { ...followerUser, is_following: false });
            }
          }
        } else {
          // orang unfollow aku → remove
          s.followers = removeById(s.followers, fid);
        }
      }
    },
  },

  extraReducers: (b) => {
    b
      .addCase(fetchFollowersThunk.pending, (s) => {
        s.statusFollowers = "loading";
        s.error = null;
      })
      .addCase(fetchFollowersThunk.fulfilled, (s, a) => {
        s.statusFollowers = "succeeded";
        s.followers = a.payload;
      })
      .addCase(fetchFollowersThunk.rejected, (s, a) => {
        s.statusFollowers = "failed";
        s.error = (a.payload as string) ?? "Failed";
      })

      .addCase(fetchFollowingThunk.pending, (s) => {
        s.statusFollowing = "loading";
        s.error = null;
      })
      .addCase(fetchFollowingThunk.fulfilled, (s, a) => {
        s.statusFollowing = "succeeded";
        // following list harus true
        s.following = a.payload.map((u) => ({ ...u, is_following: true }));
      })
      .addCase(fetchFollowingThunk.rejected, (s, a) => {
        s.statusFollowing = "failed";
        s.error = (a.payload as string) ?? "Failed";
      })

      .addCase(fetchSuggestedThunk.pending, (s) => {
        s.statusSuggested = "loading";
        s.error = null;
      })
      .addCase(fetchSuggestedThunk.fulfilled, (s, a) => {
        s.statusSuggested = "succeeded";
        const map = new Map<string, FollowUserItem>();
        for (const u of s.suggested) map.set(u.id, u);
          for (const u of a.payload) {
            const prev = map.get(u.id);
            map.set(u.id, { ...u, ...(prev ?? {}) });
          }

        s.suggested = Array.from(map.values()).slice(0, 5);
      })

      .addCase(fetchSuggestedThunk.rejected, (s, a) => {
        s.statusSuggested = "failed";
        s.error = (a.payload as string) ?? "Failed";
      })

      // ===== optimistic follow =====
      .addCase(followThunk.pending, (s, a) => {
        const targetIdNum = a.meta.arg;
        const targetId = String(targetIdNum);

        const picked = s.suggested.find((x) => x.id === targetId);

        patchIsFollowing(s.followers, targetIdNum, true);
        patchIsFollowing(s.following, targetIdNum, true);
        patchIsFollowing(s.suggested, targetIdNum, true);

        // remove dari suggested
        s.suggested = removeById(s.suggested, targetId);

        // masukin ke following
        if (picked) {
          const exists = s.following.some((x) => x.id === targetId);
          if (!exists) s.following.unshift({ ...picked, is_following: true });
        }
      })
      .addCase(followThunk.rejected, (s, a) => {
        const targetId = a.meta.arg;
        patchIsFollowing(s.followers, targetId, false);
        patchIsFollowing(s.following, targetId, false);
        patchIsFollowing(s.suggested, targetId, false);
        s.error = (a.payload as string) ?? "Failed to follow";
      })

      // ===== optimistic unfollow =====
      .addCase(unfollowThunk.pending, (s, a) => {
        const targetIdNum = a.meta.arg.id;
        const targetId = String(targetIdNum);

        // ✅ ambil dari following kalau ada, kalau tidak ada pakai user dari arg (SearchPage)
        const removed =
          s.following.find((x) => x.id === targetId) ??
          a.meta.arg.user;

        patchIsFollowing(s.followers, targetIdNum, false);
        patchIsFollowing(s.following, targetIdNum, false);
        patchIsFollowing(s.suggested, targetIdNum, false);

        // remove dari following
        s.following = s.following.filter((x) => x.id !== targetId);

        // ✅ masukin balik ke suggested walau unfollow dari SearchPage
        if (removed) {
          const exists = s.suggested.some((x) => x.id === targetId);
          if (!exists) {
            s.suggested = [{ ...removed, is_following: false }, ...s.suggested].slice(0, 5);
          }
        }
      })

      .addCase(unfollowThunk.rejected, (s, a) => {
        const targetId = a.meta.arg.id;

        patchIsFollowing(s.followers, targetId, true);
        patchIsFollowing(s.following, targetId, true);
        patchIsFollowing(s.suggested, targetId, true);

        s.error = (a.payload as string) ?? "Failed to unfollow";
      })


      .addCase(resetAll, () => initialState);
  },
});

export const { followChanged } = slice.actions;
export default slice.reducer;

export const selectFollowers = (s: RootState) => s.follow.followers;
export const selectFollowing = (s: RootState) => s.follow.following;
export const selectSuggested = (s: RootState) => s.follow.suggested;
