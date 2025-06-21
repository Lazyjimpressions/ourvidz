
import { useState } from "react";
import { PortalLayout } from "@/components/PortalLayout";
import { VideoCard } from "@/components/VideoCard";
import { VideoModal } from "@/components/VideoModal";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { EmptyLibrary } from "@/components/EmptyLibrary";
import { useUserVideos } from "@/hooks/useProject";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const Library = () => {
  const { data: videos, isLoading } = useUserVideos();
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [videoToDelete, setVideoToDelete] = useState<any>(null);
  const [showPlayModal, setShowPlayModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = (videoId: string) => {
    // TODO: Implement video deletion
    console.log('Delete video:', videoId);
    setShowDeleteModal(false);
    setVideoToDelete(null);
  };

  if (isLoading) {
    return (
      <PortalLayout title="My Videos">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </PortalLayout>
    );
  }

  // Transform database videos to match VideoCard interface
  const transformedVideos = videos?.map(video => ({
    id: video.id,
    thumbnail: video.thumbnail_url || "https://images.unsplash.com/photo-1605810230434-7631ac76ec81",
    prompt: video.project?.title || video.project?.original_prompt || "Untitled",
    createdAt: new Date(video.created_at!),
  })) || [];

  return (
    <PortalLayout title="My Videos">
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {transformedVideos.length === 0 ? (
            <EmptyLibrary />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {transformedVideos.map((video) => (
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
      </div>

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
    </PortalLayout>
  );
};

export default Library;
