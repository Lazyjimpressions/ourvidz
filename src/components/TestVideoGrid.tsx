import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TestVideoGridProps {
  jobs: any[];
  onImport: (signedUrl: string, jobId: string, prompt: string) => void;
  mode: 'image' | 'video';
}

const TestVideoGrid = ({ jobs, onImport, mode }: TestVideoGridProps) => {
  const [signedUrls, setSignedUrls] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState<string[]>([]);

  const inferBucketFromJob = (job: any): string => {
    // Primary: Use bucket from metadata if available
    if (job.metadata?.bucket) {
      console.log(`Using bucket from metadata: ${job.metadata.bucket}`);
      return job.metadata.bucket;
    }

    // Fallback logic for video buckets
    const quality = job.quality || 'fast';
    const modelVariant = job.metadata?.model_variant || '';

    // Enhanced model variants
    if (modelVariant.includes('video7b')) {
      const bucket = quality === 'high' ? 'video7b_high_enhanced' : 'video7b_fast_enhanced';
      console.log(`Using enhanced video bucket for ${modelVariant}: ${bucket}`);
      return bucket;
    }

    // Default video buckets
    const bucket = quality === 'high' ? 'video_high' : 'video_fast';
    console.log(`Using default video bucket: ${bucket}`);
    return bucket;
  };

  useEffect(() => {
    const fetchSignedUrls = async () => {
      const urls: { [key: string]: string } = {};
      for (const job of jobs) {
        if (mode === 'video' && job.video_url) {
          const bucket = inferBucketFromJob(job);
          const path = job.video_url;
          
          console.log(`Processing video job ${job.id} with bucket: ${bucket}, path: ${path}`);
          
          try {
            setLoading(prev => [...prev, job.id]);
            console.log(`Attempting to sign video URL: bucket=${bucket}, path=${path}`);
            
            const { data, error } = await supabase
              .storage
              .from(bucket)
              .createSignedUrl(path, 3600);
              
            if (!error && data?.signedUrl) {
              urls[job.id] = data.signedUrl;
              console.log(`Successfully signed video URL for ${job.id}`);
            } else {
              console.warn(`Signed video URL failed for bucket=${bucket}, path=${path}:`, error);
              toast({ 
                title: 'Video URL Error', 
                description: `Failed to sign ${path} in ${bucket}`, 
                variant: 'destructive' 
              });
            }
          } finally {
            setLoading(prev => prev.filter(id => id !== job.id));
          }
        }
      }
      setSignedUrls(urls);
    };
    
    if (jobs.length > 0) {
      fetchSignedUrls();
    }
  }, [jobs, mode]);

  const handleImport = (url: string, jobId: string, prompt: string) => {
    if (!url) {
      toast({ 
        title: 'Import Failed', 
        description: 'Missing video URL', 
        variant: 'destructive' 
      });
      return;
    }
    onImport(url, jobId, prompt);
    toast({ 
      title: 'Imported to Workspace', 
      description: 'Video added successfully!' 
    });
  };

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No videos found. Generate some content first!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {jobs.map((job, index) => {
        const signedUrl = signedUrls[job.id];
        const isLoading = loading.includes(job.id);
        const bucket = inferBucketFromJob(job);

        return (
          <div key={job.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Job {index + 1} – Video – Bucket: {bucket}
              </h3>
              <div className="text-sm text-muted-foreground">
                {job.quality || 'fast'} • {job.resolution || '720p'} • {new Date(job.created_at).toLocaleDateString()}
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {job.prompt}
            </p>

            <div className="flex gap-4 items-center">
              {isLoading ? (
                <div className="w-64 h-36 bg-muted animate-pulse rounded border border-border" />
              ) : signedUrl ? (
                <div className="relative group">
                  <video
                    src={signedUrl}
                    controls
                    className="w-64 h-36 object-cover rounded border border-border"
                    poster={job.thumbnail_url}
                  />
                  <button
                    onClick={() => handleImport(signedUrl, job.id, job.prompt)}
                    className="absolute bottom-1 left-1 right-1 bg-primary text-primary-foreground text-xs py-1 rounded opacity-0 group-hover:opacity-100 transition"
                  >
                    Import
                  </button>
                </div>
              ) : (
                <div className="w-64 h-36 bg-muted rounded border border-border flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">Failed to load video</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TestVideoGrid;