
import { Download, Play, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VideoCard } from "@/components/VideoCard";
import { VideoModal } from "@/components/VideoModal";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { EmptyLibrary } from "@/components/EmptyLibrary";

// Mock data for demonstration
const mockVideos = [
  {
    id: 1,
    thumbnail: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81",
    prompt: "A futuristic city with flying cars and neon lights",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: 2,
    thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5",
    prompt: "Matrix-style digital rain effect with green code",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
  {
    id: 3,
    thumbnail: "https://images.unsplash.com/photo-1500673922987-e212871fec22",
    prompt: "Magical forest with glowing particles",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
  },
];

const Library = () => {
  const navigate = useNavigate();
  const [selectedVideo, setSelectedVideo] = useState<typeof mockVideos[0] | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<typeof mockVideos[0] | null>(null);
  const [showPlayModal, setShowPlayModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = (videoId: number) => {
    setShowDeleteModal(false);
    setVideoToDelete(null);
    // In the future: Implement actual delete logic here
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold">My Videos</h1>
          <div className="text-sm text-gray-600 bg-white px-4 py-2 rounded-lg border">
            Tokens Remaining: 5,250
          </div>
        </div>

        {mockVideos.length === 0 ? (
          <EmptyLibrary />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {mockVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onPlay={() => {
                  setSelectedVideo(video);
                  setShowPlayModal(true);
                }}
                onDelete={() => {
                  setVideoToDelete(video);
                  setShowDeleteModal(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <VideoModal
        video={selectedVideo}
        open={showPlayModal}
        onClose={() => {
          setShowPlayModal(false);
          setSelectedVideo(null);
        }}
      />

      <DeleteConfirmationModal
        video={videoToDelete}
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setVideoToDelete(null);
        }}
        onConfirm={() => videoToDelete && handleDelete(videoToDelete.id)}
      />
    </div>
  );
};

export default Library;
