import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";
import type { RootState } from "./types";

type LikeInfo = { isLiked: boolean; likesCount: number };

type LikesState = {
  thread: Record<number, LikeInfo>;
  reply: Record<number, LikeInfo>;
  pending: Record<string, boolean>;
};

const initialState: LikesState = {
  thread: {},
  reply: {},
  pending: {},
};

// --- DB sync (toggle => create/delete di DB) ---
export const toggleThreadLike = createAsyncThunk(
  "likes/toggleThreadLike",
  async (threadId: number) => {
    const res = await api.post(
      "/likes/toggle",
      { thread_id: threadId },
      { withCredentials: true }
    );

    const liked = res.data?.result?.liked ?? res.data?.data?.liked;
    const likesCount = res.data?.result?.likesCount ?? res.data?.data?.likesCount;

    return { threadId, liked: Boolean(liked), likesCount: Number(likesCount) };
  }
);

export const toggleReplyLike = createAsyncThunk(
  "likes/toggleReplyLike",
  async (replyId: number) => {
    const res = await api.post(
      "/reply-likes/toggle",
      { reply_id: replyId },
      { withCredentials: true }
    );

    const liked = res.data?.result?.liked ?? res.data?.data?.liked;
    const likesCount = res.data?.result?.likesCount ?? res.data?.data?.likesCount;

    return { replyId, liked: Boolean(liked), likesCount: Number(likesCount) };
  }
);

// ✅ patch payload type
type PatchThreadLike = { threadId: number; isLiked?: boolean; likesCount?: number };
type PatchReplyLike = { replyId: number; isLiked?: boolean; likesCount?: number };

const likesSlice = createSlice({
  name: "likes",
  initialState,
  reducers: {
    // ✅ Seed / socket patch (tidak overwrite kalau field tidak ada)
    setThreadLikeFromServer(state, action: PayloadAction<PatchThreadLike>) {
      const { threadId, isLiked, likesCount } = action.payload;
      const id = Number(threadId);
      if (!id) return;

      const cur = state.thread[id] ?? { isLiked: false, likesCount: 0 };

      if (likesCount !== undefined) cur.likesCount = Number(likesCount);
      if (typeof isLiked === "boolean") cur.isLiked = isLiked;

      state.thread[id] = cur;
    },

    setReplyLikeFromServer(state, action: PayloadAction<PatchReplyLike>) {
      const { replyId, isLiked, likesCount } = action.payload;
      const id = Number(replyId);
      if (!id) return;

      const cur = state.reply[id] ?? { isLiked: false, likesCount: 0 };

      if (likesCount !== undefined) cur.likesCount = Number(likesCount);
      if (typeof isLiked === "boolean") cur.isLiked = isLiked;

      state.reply[id] = cur;
    },

    // Optimistic update
    optimisticToggleThread(state, action: PayloadAction<{ threadId: number }>) {
      const threadId = Number(action.payload.threadId);
      if (!threadId) return;

      const cur = state.thread[threadId] ?? { isLiked: false, likesCount: 0 };

      state.thread[threadId] = {
        isLiked: !cur.isLiked,
        likesCount: cur.isLiked ? Math.max(0, cur.likesCount - 1) : cur.likesCount + 1,
      };

      state.pending[`thread:${threadId}`] = true;
    },

    optimisticToggleReply(state, action: PayloadAction<{ replyId: number }>) {
      const replyId = Number(action.payload.replyId);
      if (!replyId) return;

      const cur = state.reply[replyId] ?? { isLiked: false, likesCount: 0 };

      state.reply[replyId] = {
        isLiked: !cur.isLiked,
        likesCount: cur.isLiked ? Math.max(0, cur.likesCount - 1) : cur.likesCount + 1,
      };

      state.pending[`reply:${replyId}`] = true;
    },

    // Rollback kalau request gagal
    rollbackThread(state, action: PayloadAction<{ threadId: number; prev: LikeInfo }>) {
      const threadId = Number(action.payload.threadId);
      if (!threadId) return;

      state.thread[threadId] = action.payload.prev;
      state.pending[`thread:${threadId}`] = false;
    },

    rollbackReply(state, action: PayloadAction<{ replyId: number; prev: LikeInfo }>) {
      const replyId = Number(action.payload.replyId);
      if (!replyId) return;

      state.reply[replyId] = action.payload.prev;
      state.pending[`reply:${replyId}`] = false;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(toggleThreadLike.fulfilled, (state, action) => {
        const { threadId, liked, likesCount } = action.payload;
        const id = Number(threadId);
        if (!id) return;

        state.thread[id] = { isLiked: liked, likesCount };
        state.pending[`thread:${id}`] = false;
      })
      .addCase(toggleReplyLike.fulfilled, (state, action) => {
        const { replyId, liked, likesCount } = action.payload;
        const id = Number(replyId);
        if (!id) return;

        state.reply[id] = { isLiked: liked, likesCount };
        state.pending[`reply:${id}`] = false;
      });
  },
});

export const {
  setThreadLikeFromServer,
  setReplyLikeFromServer,
  optimisticToggleThread,
  optimisticToggleReply,
  rollbackThread,
  rollbackReply,
} = likesSlice.actions;

export default likesSlice.reducer;

// selectors
export const selectThreadLike = (threadId: number) => (s: RootState) =>
  s.likes.thread[Number(threadId)] ?? { isLiked: false, likesCount: 0 };

export const selectReplyLike = (replyId: number) => (s: RootState) =>
  s.likes.reply[Number(replyId)] ?? { isLiked: false, likesCount: 0 };

export const selectLikePending = (key: string) => (s: RootState) =>
  Boolean(s.likes.pending[key]);

export const selectThreadLikeMaybe = (threadId: number) => (s: RootState) =>
  s.likes.thread[Number(threadId)];

export const selectReplyLikeMaybe = (replyId: number) => (s: RootState) =>
  s.likes.reply[Number(replyId)];

