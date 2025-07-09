import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';

interface TestVideoGridProps {
  jobs: any[];
  onAutoAdd?: (url: string, jobId: string, prompt: string) => void;
}

interface VideoModalData {
  signedUrl: string;
  jobId: string;
  prompt: string;
  quality: string;
  modelType: string;
  thumbnail?: string;
}

const TestVideoGrid = ({ jobs, onAutoAdd }: TestVideoGridProps) => {
  const [signedUrls, setSignedUrls] = useState<{ [key: string]: string }>({});
  const [selectedVideo, setSelectedVideo] = useState<VideoModalData | null>(null);

  useEffect(() => {
    const fetchSignedUrls = async () => {
      const sessionCache = JSON.parse(sessionStorage.getItem('signed_urls') || '{}');
      const updatedCache = { ...sessionCache };
      const result: { [key: string]: string } = {};

      await Promise.all(jobs.map(async (job) => {
        const bucket = job.metadata?.bucket || 'video_fast';
        const attempts = [job.video_url, job.metadata?.primary_asset];

        for (const path of attempts) {
          if (!path) continue;
          const key = `${bucket}|${path}`;

          if (sessionCache[key]) {
            result[path] = sessionCache[key];
            if (onAutoAdd) onAutoAdd(sessionCache[key], job.id, job.metadata?.prompt || '');
            break;
          } else {
            const { data, error } = await supabase
              .storage
              .from(bucket)
              .createSignedUrl(path, 3600);

            if (data?.signedUrl) {
              result[path] = data.signedUrl;
              updatedCache[key] = data.signedUrl;
              if (onAutoAdd) onAutoAdd(data.signedUrl, job.id, job.metadata?.prompt || '');
              break;
            }
          }
        }

        // If no result, trigger toast for failure
        const validPath = attempts.find(p => !!p);
        if (validPath && !result[validPath]) {
          toast({ title: 'Video Signing Failed', description: validPath, variant: 'destructive' });
        }
      }));

      sessionStorage.setItem('signed_urls', JSON.stringify(updatedCache));
      setSignedUrls(result);
    };

    fetchSignedUrls();
  }, [jobs, onAutoAdd]);

  const handleVideoClick = (job: any, signedUrl: string) => {
    const path = job.video_url || job.metadata?.primary_asset;
    if (!path || !signedUrl) return;

    setSelectedVideo({
      signedUrl,
      jobId: job.id,
      prompt: job.metadata?.prompt || 'No prompt available',
      quality: job.quality || 'fast',
      modelType: job.model_type || 'wan',
      thumbnail: job.thumbnail_url
    });
  };

  const handleCloseModal = () => {
    setSelectedVideo(null);
  };

  return (
    <>
      <div className="space-y-6">
        {jobs.map((job, index) => {
          const path = job.video_url || job.metadata?.primary_asset;
          const signed = path ? signedUrls[path] : null;
          return (
            <div key={job.id} className="border border-gray-700 rounded p-4">
              <h3 className="text-md font-semibold mb-2">
                Video {index + 1} – {job.quality || 'fast'} – {job.model_type || 'wan'}
              </h3>

              {signed ? (
                <div 
                  className="cursor-pointer group"
                  onClick={() => handleVideoClick(job, signed)}
                >
                  <video
                    controls
                    className="rounded border border-gray-600 object-cover w-full h-48 group-hover:border-blue-400 transition-colors"
                    preload="metadata"
                    poster={job.thumbnail_url || undefined}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <source src={signed} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  <div className="mt-2 text-xs text-gray-400 text-center">
                    Click to expand video
                  </div>
                </div>
              ) : (
                <div className="w-full h-48 bg-gray-800 animate-pulse rounded" />
              )}
            </div>
          );
        })}
      </div>

      {/* Video Expansion Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-lg pr-8">
              {selectedVideo?.prompt}
            </DialogTitle>
            <button
              onClick={handleCloseModal}
              className="rounded-full p-1 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogHeader>
          
          {selectedVideo && (
            <div className="mt-4">
              <div className="text-sm text-gray-500 mb-3">
                Quality: {selectedVideo.quality} • Model: {selectedVideo.modelType}
              </div>
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  controls
                  className="w-full h-full object-contain"
                  preload="metadata"
                  poster={selectedVideo.thumbnail}
                  autoPlay
                >
                  <source src={selectedVideo.signedUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TestVideoGrid;