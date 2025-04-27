
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VideoModalProps {
  video: {
    id: number;
    thumbnail: string;
    prompt: string;
    createdAt: Date;
  } | null;
  open: boolean;
  onClose: () => void;
}

export const VideoModal = ({ video, open, onClose }: VideoModalProps) => {
  if (!video) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-lg">{video.prompt}</DialogTitle>
        </DialogHeader>
        <div className="aspect-video">
          <img
            src={video.thumbnail}
            alt={video.prompt}
            className="w-full h-full object-cover rounded-md"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
