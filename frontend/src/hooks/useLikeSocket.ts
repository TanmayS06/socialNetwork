import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store/types";
import { socket } from "@/lib/socket";
import { setThreadLikeFromServer } from "@/store/likes";

export function useLikeSocket() {
    const dispatch = useDispatch<AppDispatch>();
    const myId = useSelector((s: RootState) => s.auth.id);

    useEffect(() => {
        if (!myId) return;
        if (!socket.connected) socket.connect();

        const handler = (p: { threadId: number; likesCount: number; isLiked?: boolean }) => {
        dispatch(
            setThreadLikeFromServer({
            threadId: Number(p.threadId),
            likesCount: Number(p.likesCount),
            ...(typeof p.isLiked === "boolean" ? { isLiked: p.isLiked } : {}),
            })
        );
        };

        socket.on("thread:like_updated", handler);
        return () => {
        socket.off("thread:like_updated", handler);
        };
    }, [dispatch, myId]);
}
