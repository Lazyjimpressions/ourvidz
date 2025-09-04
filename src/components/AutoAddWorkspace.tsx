import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AutoAddWorkspaceProps {
  onAutoAdd: (url: string, jobId: string, prompt: string, type: 'image' | 'video', quality?: string, modelType?: string) => void;
  imageJobs: any[];
  videoJobs: any[];
  isClearing?: boolean;
}

const AutoAddWorkspace = ({ onAutoAdd, imageJobs, videoJobs, isClearing = false }: AutoAddWorkspaceProps) => {
  const [signedUrls, setSignedUrls] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedJobs, setProcessedJobs] = useState<Set<string>>(new Set());
  
  // Helper to check if workspace is cleared
  const isWorkspaceCleared = () => {
    return (
      sessionStorage.getItem('workspaceCleared') === 'true' ||
      localStorage.getItem('workspaceCleared') === 'true'
    );
  };

  // Use useRef to maintain stable reference to onAutoAdd callback
  const onAutoAddRef = useRef(onAutoAdd);
  onAutoAddRef.current = onAutoAdd;

  // Safe bucket detection logic - only use existing buckets
  const inferBucketFromJob = (job: any): string => {
    // Primary: Use bucket from metadata if available
    if (job.metadata?.bucket) {
      return job.metadata.bucket;
    }

    // Fallback logic based on job properties
    const mode = job.generation_mode || '';
    const quality = job.quality || 'fast';

    // SDXL models
    if (mode.includes('sdxl')) {
      return quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
    }

    // Default buckets - only use known existing buckets
    return quality === 'high' ? 'image_high' : 'image_fast';
  };

  // Helper to check if URL should be signed
  const shouldSignUrl = (path: string): boolean => {
    if (!path || typeof path !== 'string') return false;
    if (path.startsWith('data:')) return false;
    if (path.startsWith('http://') || path.startsWith('https://')) return false;
    return true;
  };

  // Helper to normalize storage path
  const normalizePath = (path: string): string => {
    return path?.trim().replace(/^\/+|\/+$/g, '') || '';
  };

  // Process image jobs
  useEffect(() => {
    if (isWorkspaceCleared() || isClearing) {
      console.log('🛑 Auto-add is disabled due to workspaceCleared flag or clearing');
      return;
    }

    const fetchSignedUrls = async () => {
      // Guard against concurrent processing or clearing
      if (isProcessing || imageJobs.length === 0 || isClearing) {
        console.log('🛑 Skipping image processing - already processing, no jobs, or clearing');
        return;
      }

      // Check if all jobs have already been processed
      const unprocessedJobs = imageJobs.filter(job => !processedJobs.has(job.id));
      if (unprocessedJobs.length === 0) {
        console.log('✅ All image jobs already processed, skipping');
        return;
      }

      setIsProcessing(true);
      setLoading(true);
      
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
          const jobQuality = job.quality || 'fast';
          const jobModelType = job.generation_mode?.includes('sdxl') ? 'SDXL' : 'WAN';

          for (const rawPath of job.image_urls) {
            const normalizedPath = normalizePath(rawPath);
            
            // Skip URLs that shouldn't be signed
            if (!shouldSignUrl(normalizedPath)) {
              if (onAutoAddRef.current) {
                onAutoAddRef.current(rawPath, job.id, jobPrompt, 'image', jobQuality, jobModelType);
              }
              continue;
            }

            const key = `${bucket}|${normalizedPath}`;

            if (sessionCache[key]) {
              result[normalizedPath] = sessionCache[key];
              // Auto-add cached URLs to workspace
              if (onAutoAddRef.current) {
                onAutoAddRef.current(sessionCache[key], job.id, jobPrompt, 'image', jobQuality, jobModelType);
              }
            } else {
              try {
                const { data, error } = await supabase
                  .storage
                  .from(bucket)
                  .createSignedUrl(normalizedPath, 3600);

                if (data?.signedUrl) {
                  result[normalizedPath] = data.signedUrl;
                  updatedCache[key] = data.signedUrl;
                  
                  // Preload image for better UX
                  const preload = new Image();
                  preload.src = data.signedUrl;
                  
                  // Auto-add new URLs to workspace
                  if (onAutoAddRef.current) {
                    onAutoAddRef.current(data.signedUrl, job.id, jobPrompt, 'image', jobQuality, jobModelType);
                  }
                } else {
                  console.warn(`Failed to sign URL for ${normalizedPath.substring(0, 50)}...`);
                }
              } catch (error) {
                console.warn(`Error signing URL for ${normalizedPath.substring(0, 50)}...`);
              }
            }
          }
          
          // Mark job as processed
          newProcessedJobs.add(job.id);
        }));

        sessionStorage.setItem('signed_urls', JSON.stringify(updatedCache));
        setSignedUrls(prev => ({ ...prev, ...result }));
        setProcessedJobs(newProcessedJobs);
      } catch (error) {
        console.error('Error in fetchSignedUrls:', error);
        toast.error('Failed to generate signed URLs');
      } finally {
        setLoading(false);
        setIsProcessing(false);
      }
    };

    fetchSignedUrls();
  }, [imageJobs, isClearing]); // Removed onAutoAdd from dependencies

  // Process video jobs
  useEffect(() => {
    if (isWorkspaceCleared() || isClearing) {
      console.log('🛑 Auto-add is disabled due to workspaceCleared flag or clearing');
      return;
    }

    const fetchVideoSignedUrls = async () => {
      // Guard against concurrent processing or clearing
      if (isProcessing || videoJobs.length === 0 || isClearing) {
        console.log('🛑 Skipping video processing - already processing, no jobs, or clearing');
        return;
      }

      // Check if all jobs have already been processed
      const unprocessedJobs = videoJobs.filter(job => !processedJobs.has(job.id));
      if (unprocessedJobs.length === 0) {
        console.log('✅ All video jobs already processed, skipping');
        return;
      }

      setIsProcessing(true);
      
      const sessionCache = JSON.parse(sessionStorage.getItem('signed_urls') || '{}');
      const updatedCache = { ...sessionCache };
      const result: { [key: string]: string } = {};
      const newProcessedJobs = new Set(processedJobs);

      try {
        await Promise.all(unprocessedJobs.map(async (job) => {
          const bucket = job.metadata?.bucket || 'video_fast';
          const attempts = [job.video_url, job.metadata?.primary_asset];
          const jobPrompt = job.metadata?.prompt || 'No prompt available';
          const jobQuality = job.quality || 'fast';
          const jobModelType = job.metadata?.model_type || 'WAN';

          for (const rawPath of attempts) {
            if (!rawPath) continue;
            const normalizedPath = normalizePath(rawPath);
            
            // Skip URLs that shouldn't be signed
            if (!shouldSignUrl(normalizedPath)) {
              if (onAutoAddRef.current) {
                onAutoAddRef.current(rawPath, job.id, jobPrompt, 'video', jobQuality, jobModelType);
              }
              break;
            }

            const key = `${bucket}|${normalizedPath}`;

            if (sessionCache[key]) {
              result[normalizedPath] = sessionCache[key];
              // Auto-add cached URLs to workspace
              if (onAutoAddRef.current) {
                onAutoAddRef.current(sessionCache[key], job.id, jobPrompt, 'video', jobQuality, jobModelType);
              }
              break;
            } else {
              try {
                const { data, error } = await supabase
                  .storage
                  .from(bucket)
                  .createSignedUrl(normalizedPath, 3600);

                if (data?.signedUrl) {
                  result[normalizedPath] = data.signedUrl;
                  updatedCache[key] = data.signedUrl;
                  
                  // Auto-add new URLs to workspace
                  if (onAutoAddRef.current) {
                    onAutoAddRef.current(data.signedUrl, job.id, jobPrompt, 'video', jobQuality, jobModelType);
                  }
                  break;
                } else {
                  console.warn(`Failed to sign video URL for ${normalizedPath.substring(0, 50)}...`);
                }
              } catch (error) {
                console.warn(`Error signing video URL for ${normalizedPath.substring(0, 50)}...`);
              }
            }
          }

          // If no result, trigger toast for failure
          const validPath = attempts.find(p => !!p);
          if (validPath && !result[validPath]) {
            toast.error(`Video signing failed: ${validPath}`);
          }
          
          // Mark job as processed
          newProcessedJobs.add(job.id);
        }));

        sessionStorage.setItem('signed_urls', JSON.stringify(updatedCache));
        setSignedUrls(prev => ({ ...prev, ...result }));
        setProcessedJobs(newProcessedJobs);
      } catch (error) {
        console.error('Error in fetchVideoSignedUrls:', error);
        toast.error('Failed to generate signed video URLs');
      } finally {
        setIsProcessing(false);
      }
    };

    fetchVideoSignedUrls();
  }, [videoJobs, isClearing]); // Removed onAutoAdd from dependencies

  // This component doesn't render anything visible
  return null;
};

export default AutoAddWorkspace; 