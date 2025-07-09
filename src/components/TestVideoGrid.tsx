import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TestVideoGridProps {
  jobs: any[];
  onAutoAdd?: (url: string, jobId: string, prompt: string) => void;
  mode: 'image' | 'video';
}

const TestVideoGrid = ({ jobs, onAutoAdd, mode }: TestVideoGridProps) => {
  const [signedUrls, setSignedUrls] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSignedUrls = async () => {
      if (jobs.length === 0) return;
      
      setLoading(true);
      console.log('🔄 Starting signed video URL generation for', jobs.length, 'jobs');
      
      const sessionCache = JSON.parse(sessionStorage.getItem('signed_urls') || '{}');
      const updatedCache = { ...sessionCache };
      const result: { [key: string]: string } = {};

      try {
        await Promise.all(jobs.map(async (job) => {
          const path = job.video_url || job.metadata?.primary_asset;
          const bucket = job.metadata?.bucket || 'video_fast';
          const key = `${bucket}|${path}`;
          const jobPrompt = job.metadata?.prompt || 'No prompt available';

          if (!path) {
            console.warn('Job has no video path:', job.id);
            return;
          }

          if (sessionCache[key]) {
            result[path] = sessionCache[key];
            console.log(`Using cached video URL for ${job.id}`);
            // Auto-add cached URLs to workspace
            if (onAutoAdd) {
              onAutoAdd(sessionCache[key], job.id, jobPrompt);
            }
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
                console.log(`Successfully signed video URL for ${job.id}`);
                
                // Auto-add new URLs to workspace
                if (onAutoAdd) {
                  onAutoAdd(data.signedUrl, job.id, jobPrompt);
                }
              } else {
                console.error(`Failed to sign video URL for ${job.id}:`, error);
                toast({ 
                  title: 'Video Signing Failed', 
                  description: `Failed to sign ${path} in ${bucket}`, 
                  variant: 'destructive' 
                });
              }
            } catch (error) {
              console.error(`Error signing video URL for ${job.id}:`, error);
              toast({ 
                title: 'Video Signing Error', 
                description: `Error signing ${path}`, 
                variant: 'destructive' 
              });
            }
          }
        }));

        sessionStorage.setItem('signed_urls', JSON.stringify(updatedCache));
        setSignedUrls(result);
        console.log('✅ Signed video URL generation completed. Total URLs:', Object.keys(result).length);
      } catch (error) {
        console.error('Error in fetchSignedUrls:', error);
        toast({ 
          title: 'Video URL Generation Error', 
          description: 'Failed to generate signed video URLs', 
          variant: 'destructive' 
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrls();
  }, [jobs, onAutoAdd]);

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No videos found. Generate some content first!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loading && (
        <div className="text-center py-4">
          <p className="text-muted-foreground">Loading and auto-adding videos to workspace...</p>
        </div>
      )}
      
      {jobs.map((job, index) => {
        const path = job.video_url || job.metadata?.primary_asset;
        const signed = path ? signedUrls[path] : null;
        const bucket = job.metadata?.bucket || 'video_fast';
        const jobPrompt = job.metadata?.prompt || 'No prompt available';
        const jobQuality = job.quality || job.metadata?.quality || 'fast';
        const jobModelType = job.model_type || job.metadata?.model_type || 'wan';

        return (
          <div key={job.id} className="border border-gray-700 rounded p-4">
            <h3 className="text-md font-semibold mb-2">
              Video {index + 1} – {jobQuality} – {jobModelType} – Bucket: {bucket}
            </h3>
            
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {jobPrompt}
            </p>

            {signed ? (
              <video
                controls
                className="rounded border border-gray-600 object-cover w-full h-48"
                preload="metadata"
                poster={job.thumbnail_url || ''}
              >
                <source src={signed} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="w-full h-48 bg-gray-800 animate-pulse rounded flex items-center justify-center">
                <span className="text-xs text-gray-500">Loading...</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TestVideoGrid;