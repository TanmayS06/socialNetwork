import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ImagePlus } from "lucide-react";
import { useSelector } from "react-redux";
import { selectMe, selectAvatarVersion } from "@/store/profile";
import { avatarImgSrc } from "@/lib/image";
import { useOutletContext } from "react-router-dom";

type OutletCtx = {
  openCreatePost: () => void;
};

const CreatePostTrigger = () => {
  const { openCreatePost } = useOutletContext<OutletCtx>();

  const me = useSelector(selectMe);
  const v = useSelector(selectAvatarVersion);

  const src = avatarImgSrc(me?.avatar, v);
  const fallback = (me?.name?.[0] ?? "U").toUpperCase();

  return (
    <div
      onClick={openCreatePost}
      className="flex items-center gap-4 border-b border-zinc-800 px-4 py-4 hover:bg-zinc-900/50 cursor-pointer"
    >
      <Avatar>
        <AvatarImage src={src} />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>

      <div className="flex w-full items-center justify-between gap-3">
        <div className="text-base text-zinc-500">What's on your mind? Share a thought...</div>

        <div className="flex items-center gap-3 pointer-events-none opacity-60">
          <div className="text-violet-400">
            <ImagePlus className="h-5 w-5" />
          </div>

          <Button
            type="button"
            className="h-8 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-sm text-white font-medium"
            disabled
          >
            Post
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostTrigger;
