import { Button } from "@/components/ui/button";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/store/types";
import { followThunk, unfollowThunk, type FollowUserItem } from "@/store/follow";
import { notify } from "@/lib/toast"; 
type Props = {
  userId: string | number;
  isFollowing: boolean;
  onToggle?: (next: boolean) => void;

  //untuk unfollow dari SearchPage supaya bisa masuk suggested
  user?: FollowUserItem;
};

export default function FollowButton({ userId, isFollowing, onToggle, user }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const idNum = Number(userId);

  async function onClick() {
    if (!Number.isFinite(idNum)) return;

    const next = !isFollowing;

    // optimistic update UI lokal (SearchPage)
    onToggle?.(next);

    try {
      if (isFollowing) {
        //pass user data supaya reducer bisa masukin balik ke suggested
        await dispatch(unfollowThunk({ id: idNum, user })).unwrap();

        notify.success("You have unfollowed this user.");
      } else {
        await dispatch(followThunk(idNum)).unwrap();

        notify.success("You are now following this user.");
      }
    } catch {
      // rollback UI lokal
      onToggle?.(isFollowing);

      notify.error("Something went wrong. Please try again.");
    }
  }

  return (
    <Button
      onClick={onClick}
      variant={isFollowing ? "outline" : "default"}
      className={`rounded-full px-4 py-1 text-sm ${
        isFollowing
          ? "border border-zinc-600 text-zinc-200"
          : "bg-white text-black hover:bg-zinc-200"
      }`}
    >
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
}
