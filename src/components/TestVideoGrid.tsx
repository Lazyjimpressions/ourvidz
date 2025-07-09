import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PromptInfoModal } from '@/components/PromptInfoModal';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedJobs, setProcessedJobs] = useState<Set<string>>(new Set());
  const [showPromptModal, setShowPromptModal] = useState(false);
  
  // Use useRef to maintain stable reference to onAutoAdd callback
  const onAutoAddRef = useRef(onAutoAdd);
  onAutoAddRef.current = onAutoAdd;

  useEffect(() => {
    const fetchSignedUrls = async () => {
      // Guard against concurrent processing
      if (isProcessing || jobs.length === 0) {
        console.log('🛑 Skipping video processing - already processing or no jobs');
        return;
      }

      // Check if all jobs have already been processed
      const unprocessedJobs = jobs.filter(job => !processedJobs.has(job.id));
      if (unprocessedJobs.length === 0) {
        console.log('✅ All video jobs already processed, skipping');
        return;
      }

      setIsProcessing(true);
      console.log('🔄 Starting video signed URL generation for', unprocessedJobs.length, 'unprocessed jobs');
      
      const sessionCache = JSON.parse(sessionStorage.getItem('signed_urls') || '{}');
      const updatedCache = { ...sessionCache };
      const result: { [key: string]: string } = {};
      const newProcessedJobs = new Set(processedJobs);

      try {
        await Promise.all(unprocessedJobs.map(async (job) => {
          const bucket = job.metadata?.bucket || 'video_fast';
          const attempts = [job.video_url, job.metadata?.primary_asset];
          const jobPrompt = job.metadata?.prompt || 'No prompt available';

          for (const path of attempts) {
            if (!path) continue;
            const key = `${bucket}|${path}`;

            if (sessionCache[key]) {
              result[path] = sessionCache[key];
              console.log(`Using cached video URL for ${path}`);
              // Auto-add cached URLs to workspace
              if (onAutoAddRef.current) {
                onAutoAddRef.current(sessionCache[key], job.id, jobPrompt);
              }
              break;
            } else {
              try {
                console.log(`Requesting signed video URL for bucket=${bucket}, path=${path}`);
                const { data, error } = await supabase
                  .storage
                  .from(bucket)
                  .createSignedUrl(path, 3600);

                if (data?.signedUrl) {
                  result[path] = data.signedUrl;
                  updatedCache[key] = data.signedUrl;
                  console.log(`Successfully signed video URL for ${path}`);
                  
                  // Auto-add new URLs to workspace
                  if (onAutoAddRef.current) {
                    onAutoAddRef.current(data.signedUrl, job.id, jobPrompt);
                  }
                  break;
                } else {
                  console.error(`Failed to sign video URL for ${path}:`, error);
                }
              } catch (error) {
                console.error(`Error signing video URL for ${path}:`, error);
              }
            }
          }

          // If no result, trigger toast for failure
          const validPath = attempts.find(p => !!p);
          if (validPath && !result[validPath]) {
            toast({ title: 'Video Signing Failed', description: validPath, variant: 'destructive' });
          }
          
          // Mark job as processed
          newProcessedJobs.add(job.id);
        }));

        sessionStorage.setItem('signed_urls', JSON.stringify(updatedCache));
        setSignedUrls(prev => ({ ...prev, ...result }));
        setProcessedJobs(newProcessedJobs);
        console.log('✅ Video signed URL generation completed. Total URLs:', Object.keys(result).length);
      } catch (error) {
        console.error('Error in fetchSignedUrls:', error);
        toast({ 
          title: 'Video URL Generation Error', 
          description: 'Failed to generate signed video URLs', 
          variant: 'destructive' 
        });
      } finally {
        setIsProcessing(false);
      }
    };

    fetchSignedUrls();
  }, [jobs]); // Removed onAutoAdd from dependencies

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

  const handleShowPromptInfo = () => {
    setShowPromptModal(true);
  };

  const handleClosePromptModal = () => {
    setShowPromptModal(false);
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
            <div className="flex items-center gap-2">
              {selectedVideo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShowPromptInfo}
                  className="rounded-full p-1 hover:bg-gray-100 transition-colors"
                >
                  <Info className="h-4 w-4" />
                </Button>
              )}
              <button
                onClick={handleCloseModal}
                className="rounded-full p-1 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
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

      {/* Prompt Info Modal */}
      {selectedVideo && (
        <PromptInfoModal
          isOpen={showPromptModal}
          onClose={handleClosePromptModal}
          prompt={selectedVideo.prompt}
          quality={selectedVideo.quality as any}
          mode="video"
          timestamp={new Date()}
          contentCount={1}
          itemId={selectedVideo.jobId}
        />
      )}
    </>
  );
};

export default TestVideoGrid;