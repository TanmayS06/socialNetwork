import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "@/store/types";
import { socket } from "@/lib/socket";
import { followChanged } from "@/store/follow";
import { profileFollowCountChanged, selectMe } from "@/store/profile";

export function useFollowSocket() {
  const dispatch = useDispatch<AppDispatch>();

  // ❗ PENTING: ambil dari profile, bukan auth
  const me = useSelector(selectMe);
  const myId = me?.id;

  // connect socket setelah profile siap
  useEffect(() => {
    if (!myId) return;

    if (!socket.connected) socket.connect();

    const onConnect = () => {
      console.log("🟢 socket connected:", socket.id);

      // ✅ join room user (penting kalau server pakai io.to(`user:${id}`))
      socket.emit("user:join", { userId: myId });
    };

    const onDisconnect = (r: any) =>
    console.log("🔴 socket disconnected:", r);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // kalau socket sudah connected duluan
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [myId]);

  // listen follow:changed + patch store
  useEffect(() => {
    if (!myId) return;

    const handler = (payload: {
      followerId: number;
      targetUserId: number;
      isFollowing: boolean;
      followerUser?: {
        id: string;
        username: string;
        name: string;
        avatar: string;
      };
    }) => {
      console.log("[follow:changed]", payload);

      // ✅ 1) update counts MyProfilePage
      dispatch(
        profileFollowCountChanged({
          myId,
          followerId: payload.followerId,
          targetUserId: payload.targetUserId,
          isFollowing: payload.isFollowing,
        })
      );

      // ✅ 2) update followers / following / suggested
      dispatch(followChanged({ myId, ...payload }));
    };

    socket.on("follow:changed", handler);
    return () => {
      socket.off("follow:changed", handler);
    };
  }, [dispatch, myId]);
}
