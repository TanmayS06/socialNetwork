import { toast } from "sonner";

type ToastOpts = {
    duration?: number;
};

export const notify = {
    success: (message: string, opts?: ToastOpts) =>
        toast.success(message, { duration: opts?.duration }),
    error: (message: string, opts?: ToastOpts) =>
        toast.error(message, { duration: opts?.duration }),
    info: (message: string, opts?: ToastOpts) =>
        toast(message, { duration: opts?.duration }),
    warning: (message: string, opts?: ToastOpts) =>
        toast.warning?.(message, { duration: opts?.duration }) ?? toast(message, { duration: opts?.duration }),

    // optional: promise helper (buat async action)
    promise: <T>(
        p: Promise<T>,
        msgs: { loading: string; success: string; error: string },
        opts?: ToastOpts
    ) =>
        toast.promise(p, {
        loading: msgs.loading,
        success: msgs.success,
        error: msgs.error,
        duration: opts?.duration,
        }),
};
