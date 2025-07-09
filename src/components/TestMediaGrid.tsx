import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TestMediaGridProps {
  jobs: any[];
  onAutoAdd?: (url: string, jobId: string, prompt: string) => void;
  mode: 'image' | 'video';
}

const TestMediaGrid = ({ jobs, onAutoAdd, mode }: TestMediaGridProps) => {
  const [signedUrls, setSignedUrls] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedJobs, setProcessedJobs] = useState<Set<string>>(new Set());
  
  // Use useRef to maintain stable reference to onAutoAdd callback
  const onAutoAddRef = useRef(onAutoAdd);
  onAutoAddRef.current = onAutoAdd;

  // Enhanced bucket detection logic
  const inferBucketFromJob = (job: any): string => {
    // Primary: Use bucket from metadata if available
    if (job.metadata?.bucket) {
      console.log(`Using bucket from metadata: ${job.metadata.bucket}`);
      return job.metadata.bucket;
    }

    // Fallback logic based on job properties
    const mode = job.generation_mode || '';
    const quality = job.quality || 'fast';
    const modelVariant = job.metadata?.model_variant || '';

    // Enhanced model variants
    if (modelVariant.includes('image7b')) {
      const bucket = quality === 'high' ? 'image7b_high_enhanced' : 'image7b_fast_enhanced';
      console.log(`Using enhanced bucket for ${modelVariant}: ${bucket}`);
      return bucket;
    }

    // SDXL models
    if (mode.includes('sdxl')) {
      const bucket = quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
      console.log(`Using SDXL bucket: ${bucket}`);
      return bucket;
    }

    // Default buckets
    const bucket = quality === 'high' ? 'image_high' : 'image_fast';
    console.log(`Using default bucket: ${bucket}`);
    return bucket;
  };

  useEffect(() => {
    const fetchSignedUrls = async () => {
      // Guard against concurrent processing
      if (isProcessing || jobs.length === 0) {
        console.log('🛑 Skipping processing - already processing or no jobs');
        return;
      }

      // Check if all jobs have already been processed
      const unprocessedJobs = jobs.filter(job => !processedJobs.has(job.id));
      if (unprocessedJobs.length === 0) {
        console.log('✅ All jobs already processed, skipping');
        return;
      }

      setIsProcessing(true);
      setLoading(true);
      console.log('🔄 Starting signed URL generation for', unprocessedJobs.length, 'unprocessed jobs');
      
      const sessionCache = JSON.parse(sessionStorage.getItem('signed_urls') || '{}');
      const updatedCache = { ...sessionCache };
      const result: { [key: string]: string } = {};
      const newProcessedJobs = new Set(processedJobs);

      try {
        await Promise.all(unprocessedJobs.map(async (job) => {
          if (!Array.isArray(job.image_urls)) {
            console.warn('Job has no image_urls array:', job.id);
            newProcessedJobs.add(job.id);
            return;
          }

          const bucket = inferBucketFromJob(job);
          const jobPrompt = job.metadata?.prompt || job.prompt || 'No prompt available';
          console.log(`Processing job ${job.id} with bucket: ${bucket}, paths:`, job.image_urls);

          for (const path of job.image_urls) {
            const key = `${bucket}|${path}`;

            if (sessionCache[key]) {
              result[path] = sessionCache[key];
              console.log(`Using cached URL for ${path}`);
              // Auto-add cached URLs to workspace
              if (onAutoAddRef.current) {
                onAutoAddRef.current(sessionCache[key], job.id, jobPrompt);
              }
            } else {
              try {
                console.log(`Requesting signed URL for bucket=${bucket}, path=${path}`);
                const { data, error } = await supabase
                  .storage
                  .from(bucket)
                  .createSignedUrl(path, 3600);

                if (data?.signedUrl) {
                  result[path] = data.signedUrl;
                  updatedCache[key] = data.signedUrl;
                  console.log(`Successfully signed URL for ${path}`);
                  
                  // Preload image for better UX
                  const preload = new Image();
                  preload.src = data.signedUrl;
                  
                  // Auto-add new URLs to workspace
                  if (onAutoAddRef.current) {
                    onAutoAddRef.current(data.signedUrl, job.id, jobPrompt);
                  }
                } else {
                  console.error(`Failed to sign URL for ${path}:`, error);
                  toast({ 
                    title: 'Signing Failed', 
                    description: `Failed to sign ${path} in ${bucket}`, 
                    variant: 'destructive' 
                  });
                }
              } catch (error) {
                console.error(`Error signing URL for ${path}:`, error);
                toast({ 
                  title: 'Signing Error', 
                  description: `Error signing ${path}`, 
                  variant: 'destructive' 
                });
              }
            }
          }
          
          // Mark job as processed
          newProcessedJobs.add(job.id);
        }));

        sessionStorage.setItem('signed_urls', JSON.stringify(updatedCache));
        setSignedUrls(prev => ({ ...prev, ...result }));
        setProcessedJobs(newProcessedJobs);
        console.log('✅ Signed URL generation completed. Total URLs:', Object.keys(result).length);
      } catch (error) {
        console.error('Error in fetchSignedUrls:', error);
        toast({ 
          title: 'URL Generation Error', 
          description: 'Failed to generate signed URLs', 
          variant: 'destructive' 
        });
      } finally {
        setLoading(false);
        setIsProcessing(false);
      }
    };

    fetchSignedUrls();
  }, [jobs]); // Removed onAutoAdd from dependencies

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No images found. Generate some content first!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loading && (
        <div className="text-center py-4">
          <p className="text-muted-foreground">Loading and auto-adding images to workspace...</p>
        </div>
      )}
      
      {jobs.map((job, index) => {
        const bucket = inferBucketFromJob(job);
        const jobPrompt = job.metadata?.prompt || job.prompt || 'No prompt available';
        const jobQuality = job.quality || job.metadata?.quality || 'fast';
        const jobMode = job.generation_mode || job.metadata?.generation_format || 'unknown';

        return (
          <div key={job.id} className="border border-gray-700 rounded p-4">
            <h3 className="text-md font-semibold mb-2">
              Job {index + 1} – {jobMode} – {jobQuality} – Bucket: {bucket}
            </h3>
            
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {jobPrompt}
            </p>

            <div className="grid grid-cols-3 gap-4">
              {Array.isArray(job.image_urls) && job.image_urls.length > 0 ? (
                job.image_urls.map((path: string) => {
                  const signed = signedUrls[path];
                  return (
                    <div key={path} className="relative">
                      {signed ? (
                        <img
                          src={signed}
                          alt="Generated asset"
                          className="rounded border border-gray-600 object-cover h-36 w-full"
                          onError={(e) => {
                            console.error('Image failed to load:', path);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-36 bg-gray-800 animate-pulse rounded flex items-center justify-center">
                          <span className="text-xs text-gray-500">Loading...</span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-3 text-center py-8">
                  <p className="text-muted-foreground">No images available for this job</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TestMediaGrid;