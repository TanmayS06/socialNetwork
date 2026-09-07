import { useEffect } from "react";
import { socket } from "@/lib/socket";

export function useReplySocket() {
  useEffect(() => {
    const onReplyCreated = (payload: any) => {
      const reply = payload?.reply ?? payload;
      const threadId =
        reply?.thread_id ??
        payload?.threadId ??
        reply?.threadId;

      if (!threadId) return;
      window.dispatchEvent(
        new CustomEvent("app:reply_created", {
          detail: {
            threadId: String(threadId),
            reply,
          },
        })
      );
    };

    socket.on("reply:created", onReplyCreated);
    return () => {
      socket.off("reply:created", onReplyCreated);
    };
  }, []);
}
