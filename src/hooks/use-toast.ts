import { toast as sonnerToast } from "sonner";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  [key: string]: unknown;
};

function toast({ title, description, variant }: ToastProps) {
  if (variant === "destructive") {
    sonnerToast.error(title, { description });
  } else {
    sonnerToast(title, { description });
  }
}

function useToast() {
  return { toast, toasts: [] as never[], dismiss: (_toastId?: string) => {} };
}

export { useToast, toast };
