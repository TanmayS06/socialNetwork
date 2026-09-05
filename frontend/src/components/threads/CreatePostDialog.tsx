import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ImagePlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useSelector } from "react-redux";
import { selectMe, selectAvatarVersion } from "@/store/profile";
import { avatarImgSrc } from "@/lib/image";
import { toast } from "sonner";

type QueueItem = {
  id: string;
  type: "info" | "success" | "error";
  text: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  afterPosted?: () => void | Promise<void>;
};

const MAX_IMAGES = 6;

const CreatePostDialog = ({ open, onOpenChange, afterPosted }: Props) => {
  const [content, setContent] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const me = useSelector(selectMe);
  const v = useSelector(selectAvatarVersion);
  const myAvatar = avatarImgSrc(me?.avatar, v);
  const fallback = (me?.name?.[0] ?? "U").toUpperCase();

  // --- inline messages (pushMsg) untuk PREVIEW / aksi lokal ---
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const pushMsg = (type: QueueItem["type"], text: string) => {
    const id = crypto.randomUUID();
    setQueue((q) => [...q, { id, type, text }]);
    setTimeout(() => setQueue((q) => q.filter((m) => m.id !== id)), 2500);
  };

  // reset ketika dialog ditutup
  useEffect(() => {
    if (!open) {
      setContent("");
      setImageFiles([]);
      setQueue([]);
      setLoading(false);
    }
  }, [open]);

  const previewUrls = useMemo(() => {
    return imageFiles.map((f) => URL.createObjectURL(f));
  }, [imageFiles]);

  useEffect(() => {
    return () => previewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [previewUrls]);

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    pushMsg("info", "Image removed.");
  };

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.currentTarget.value = "";
    if (picked.length === 0) return;

    const images = picked.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) {
      pushMsg("error", "Please select an image file.");
      return;
    }

    // hitung hasil final tanpa side-effect di updater
    const prevCount = imageFiles.length;
    const merged = [...imageFiles, ...images];
    const limited = merged.slice(0, MAX_IMAGES);

    setImageFiles(limited);

    const added = Math.max(0, limited.length - prevCount);
    if (merged.length > MAX_IMAGES) {
      pushMsg("info", `Max ${MAX_IMAGES} images. Extra images ignored.`);
    } else {
      pushMsg("info", `${added} image(s) added.`);
    }
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!content.trim() && imageFiles.length === 0) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("content", content);
    imageFiles.forEach((file) => formData.append("images", file));

    const req = api.post("/threads", formData, {
      withCredentials: true,
      headers: { "Content-Type": "multipart/form-data" },
    });

    try {
      toast.promise(req, {
        loading: "Posting...",
        success: "Posted successfully ✅",
        error: (e) => {
          const msg = e?.response?.data?.message ||
            e?.message ||
            "Failed to post";
          return msg;
        },
      });

      await afterPosted?.();
      onOpenChange(false);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent
        className="max-w-xl border-zinc-800 bg-zinc-950 text-white fixed top-10 left-1/2 transform -translate-x-1/2 translate-y-0"
        onPointerDownOutside={(e) => loading && e.preventDefault()}
        onEscapeKeyDown={(e) => loading && e.preventDefault()}
      >
        <DialogHeader>
          <VisuallyHidden>
            <DialogTitle>Create Post</DialogTitle>
          </VisuallyHidden>
        </DialogHeader>

        {/* inline preview messages */}
        {queue.length > 0 && (
          <div className="mb-4 space-y-2">
            {queue.map((m) => (
              <div
                key={m.id}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm border ${
                  m.type === "success"
                    ? "border-green-600/40 bg-green-600/10 text-green-400"
                    : m.type === "error"
                    ? "border-red-600/40 bg-red-600/10 text-red-400"
                    : "border-blue-600/40 bg-blue-600/10 text-blue-400"
                }`}
              >
                <span className="font-medium">{m.text}</span>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit();
          }}
        >
          <div className="flex gap-4 border-b w-full pb-4">
            <Avatar>
              <AvatarImage src={myAvatar} />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>

            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!loading) handleSubmit();
                }
              }}
              type="text"
              placeholder="What is happening?!"
              className="w-full bg-transparent text-lg placeholder:text-zinc-500 focus:outline-none"
              disabled={loading}
            />
          </div>

          {previewUrls.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {previewUrls.map((url, idx) => (
                <div key={url} className="relative">
                  <img
                    src={url}
                    alt={`preview-${idx}`}
                    className="w-full h-40 rounded-lg object-cover border border-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    disabled={loading}
                    className="absolute top-2 right-2 flex items-center justify-center rounded-full p-2 text-white bg-zinc-800/90 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <label
              className={`cursor-pointer rounded-full p-2 text-violet-400 hover:bg-violet-500/10 transition-colors ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <input
                type="file"
                hidden
                multiple
                accept="image/*"
                disabled={loading}
                onChange={onPickFiles}
              />
              <ImagePlus className="h-5 w-5" />
            </label>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || (!content.trim() && imageFiles.length === 0)}
              className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-6 font-semibold text-white shadow-md shadow-violet-500/20 hover:from-violet-500 hover:to-indigo-500 transition-all active:scale-[0.98]"
            >
              {loading ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostDialog;
